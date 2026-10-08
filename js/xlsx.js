/* Bộ ghi .xlsx tối giản, thuần JavaScript — không phụ thuộc thư viện nào.

   .xlsx thực chất là một file ZIP chứa vài file XML. Ở đây ZIP được ghi ở
   chế độ "store" (không nén) nên không cần cài đặt thuật toán deflate —
   Excel, LibreOffice và Google Sheets đều đọc bình thường.

   Hỗ trợ: chuỗi/số, kiểu ô (đậm, viền, nền, canh lề, xuống dòng, định dạng
   số), gộp ô, bề rộng cột, chiều cao hàng, cố định dòng tiêu đề.
*/
(function (root) {
  'use strict';

  /* ---------------- CRC32 ---------------- */
  const CRC = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------------- ghi ZIP (store) ---------------- */
  function dosTime(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) |
            (Math.floor(d.getSeconds() / 2))) & 0xFFFF;
  }
  function dosDate(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) |
            d.getDate()) & 0xFFFF;
  }

  function zipStore(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const tm = dosTime(now), dt = dosDate(now);
    const parts = [];
    const central = [];
    let offset = 0;

    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);

      const lh = new Uint8Array(30 + name.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034B50, true);   // chữ ký local header
      lv.setUint16(4, 20, true);           // version cần để giải nén
      lv.setUint16(6, 0x0800, true);       // cờ: tên file mã hoá UTF-8
      lv.setUint16(8, 0, true);            // phương pháp: 0 = store
      lv.setUint16(10, tm, true);
      lv.setUint16(12, dt, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      lv.setUint16(28, 0, true);
      lh.set(name, 30);

      parts.push(lh, data);

      const ch = new Uint8Array(46 + name.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014B50, true);   // chữ ký central directory
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, tm, true);
      cv.setUint16(14, dt, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);

      offset += lh.length + data.length;
    }

    let cdSize = 0;
    for (const c of central) cdSize += c.length;

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    let total = offset + cdSize + 22;
    const out = new Uint8Array(total);
    let p = 0;
    for (const b of parts) { out.set(b, p); p += b.length; }
    for (const c of central) { out.set(c, p); p += c.length; }
    out.set(eocd, p);
    return out;
  }

  /* ---------------- tiện ích XML ---------------- */
  const esc = s => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  function colName(n) {           // 1 -> A, 27 -> AA
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = (n - 1 - r) / 26;
    }
    return s;
  }

  /* ---------------- kiểu ô ----------------
     Chỉ số style dùng trong Sheet.set(..., s): xem bảng dưới. */
  const S = {
    NORMAL: 0, BOLD: 1, TITLE: 2, SUB: 3, HEADER: 4, CELL: 5,
    N3: 6, N2: 7, N1: 8, LABEL: 9, BOX: 10, WRAP: 11, SMALL: 12,
    SECTION: 13, OK: 14, NO: 15, HILITE: 16
  };

  const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="0.000"/>
<numFmt numFmtId="165" formatCode="0.00"/>
<numFmt numFmtId="166" formatCode="0.0"/>
</numFmts>
<fonts count="8">
<font><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><name val="Calibri"/></font>
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF1F5C2E"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFB3261E"/><name val="Calibri"/></font>
<font><i/><sz val="8"/><color rgb="FF666666"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF0B4F6C"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCE9EF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEFEFEF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FF000000"/></left>
<right style="thin"><color rgb="FF000000"/></right>
<top style="thin"><color rgb="FF000000"/></top>
<bottom style="thin"><color rgb="FF000000"/></bottom>
<diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="17">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  /* ---------------- dựng sheet ---------------- */
  function Sheet() {
    this.cells = {};        // "r,c" -> {v, s, num}
    this.merges = [];
    this.cols = [];         // {min, max, width}
    this.rowH = {};
    this.freeze = null;     // số dòng cố định
    this.maxR = 0;
    this.maxC = 0;
  }

  Sheet.prototype.set = function (r, c, v, s, num) {
    this.cells[r + ',' + c] = { v: v, s: s || 0, num: !!num };
    if (r > this.maxR) this.maxR = r;
    if (c > this.maxC) this.maxC = c;
    return this;
  };
  Sheet.prototype.text = function (r, c, v, s) { return this.set(r, c, v, s, false); };
  Sheet.prototype.num = function (r, c, v, s) {
    return this.set(r, c, (v === null || v === undefined || !isFinite(v)) ? '' : v,
                    s, isFinite(v));
  };
  Sheet.prototype.merge = function (r1, c1, r2, c2) {
    this.merges.push(colName(c1) + r1 + ':' + colName(c2) + r2);
    if (r2 > this.maxR) this.maxR = r2;
    if (c2 > this.maxC) this.maxC = c2;
    return this;
  };
  Sheet.prototype.width = function (c, w) { this.cols.push({ c: c, w: w }); return this; };
  Sheet.prototype.height = function (r, h) { this.rowH[r] = h; return this; };

  Sheet.prototype.xml = function () {
    const rows = {};
    for (const k in this.cells) {
      const [r, c] = k.split(',').map(Number);
      (rows[r] = rows[r] || []).push({ c: c, d: this.cells[k] });
    }
    let body = '';
    const keys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    for (const r of keys) {
      const list = rows[r].sort((a, b) => a.c - b.c);
      const h = this.rowH[r] ? ' ht="' + this.rowH[r] + '" customHeight="1"' : '';
      body += '<row r="' + r + '"' + h + '>';
      for (const it of list) {
        const ref = colName(it.c) + r;
        const d = it.d;
        if (d.num) {
          body += '<c r="' + ref + '" s="' + d.s + '"><v>' + d.v + '</v></c>';
        } else if (d.v === '' || d.v === null || d.v === undefined) {
          body += '<c r="' + ref + '" s="' + d.s + '"/>';
        } else {
          body += '<c r="' + ref + '" s="' + d.s + '" t="inlineStr"><is><t xml:space="preserve">' +
                  esc(d.v) + '</t></is></c>';
        }
      }
      body += '</row>';
    }

    let cols = '';
    if (this.cols.length) {
      cols = '<cols>' + this.cols.map(x =>
        '<col min="' + x.c + '" max="' + x.c + '" width="' + x.w +
        '" customWidth="1"/>').join('') + '</cols>';
    }

    let views = '<sheetViews><sheetView workbookViewId="0" showGridLines="0">';
    if (this.freeze) {
      views += '<pane ySplit="' + this.freeze + '" topLeftCell="A' +
               (this.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>';
    }
    views += '</sheetView></sheetViews>';

    const merges = this.merges.length
      ? '<mergeCells count="' + this.merges.length + '">' +
        this.merges.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>'
      : '';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + colName(Math.max(this.maxC, 1)) +
        Math.max(this.maxR, 1) + '"/>' +
      views +
      '<sheetFormatPr defaultRowHeight="14.5"/>' +
      cols +
      '<sheetData>' + body + '</sheetData>' +
      merges +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      '</worksheet>';
  };

  /* ---------------- đóng gói ---------------- */
  function build(sheet, sheetName) {
    sheetName = (sheetName || 'Sheet1').replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31);
    const files = [
      { name: '[Content_Types].xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>' },
      { name: '_rels/.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>' },
      { name: 'xl/workbook.xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="' + esc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>' },
      { name: 'xl/styles.xml', data: STYLES_XML },
      { name: 'xl/worksheets/sheet1.xml', data: sheet.xml() }
    ];
    return zipStore(files);
  }

  root.PTW = root.PTW || {};
  root.PTW.xlsx = { Sheet, build, S, colName, zipStore, crc32 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
