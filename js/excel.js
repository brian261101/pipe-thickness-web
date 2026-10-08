/* Dựng tờ tính toán dưới dạng Excel (.xlsx).

   Khác bản PDF ở chỗ: khung tên chừa sẵn hai ô trống có viền ở hai đầu để
   người dùng tự chèn logo công ty trong Excel (Insert > Pictures), thay vì
   in sẵn tên công ty.
*/
(function (root) {
  'use strict';
  const X = root.PTW.xlsx;
  const S = X.S;

  const NC = 12;            // số cột dùng: A..L

  function build(meta, ctx, rows, warns) {
    const sh = new X.Sheet();

    [[1, 11], [2, 7], [3, 9.5], [4, 9.5], [5, 10], [6, 11.5],
     [7, 10], [8, 11], [9, 9.5], [10, 10], [11, 11], [12, 12]]
      .forEach(([c, w]) => sh.width(c, w));

    let r = 1;

    /* ---------- khung tên: hai ô trống hai đầu để chèn logo ---------- */
    sh.merge(1, 1, 3, 2);
    sh.merge(1, 3, 3, 10);
    sh.merge(1, 11, 3, 12);
    for (let rr = 1; rr <= 3; rr++) {
      for (let cc = 1; cc <= NC; cc++) sh.text(rr, cc, '', S.SUB);
      sh.height(rr, 20);
    }
    sh.text(1, 1, '', S.SUB);                       // ô chèn logo (trái)
    sh.text(1, 3, (meta.project || '') +
      (meta.project ? '\n' : '') + 'TÍNH TOÁN CHIỀU DÀY THÀNH ỐNG', S.TITLE);
    sh.text(1, 11, '', S.SUB);                      // ô chèn logo (phải)
    r = 5;

    /* ---------- dòng thông tin hồ sơ ---------- */
    const metaRow = (row, pairs) => {
      let c = 1;
      for (const [k, v] of pairs) {
        sh.text(row, c, k, S.LABEL);
        sh.merge(row, c + 1, row, c + 2);
        sh.text(row, c + 1, v, S.CELL);
        sh.text(row, c + 2, '', S.CELL);
        c += 3;
      }
      sh.height(row, 17);
    };
    metaRow(r, [['Hạng mục', meta.item || ''],
                ['Số tài liệu', meta.docNo || ''],
                ['Rev', meta.rev || '0'],
                ['Ngày', meta.date || '']]);
    metaRow(r + 1, [['Người lập', meta.by || ''],
                    ['Kiểm tra', meta.checked || ''],
                    ['Phê duyệt', meta.approved || ''],
                    ['Lưu chất', ctx.fluidName || '']]);
    r += 3;

    /* ---------- 1. cơ sở tính toán ---------- */
    sh.text(r, 1, '1. CƠ SỞ TÍNH TOÁN', S.SECTION);
    r++;
    const kv = (k, v) => {
      sh.text(r, 1, k, S.BOLD);
      sh.merge(r, 3, r, NC);
      sh.text(r, 3, v, S.NORMAL);
      r++;
    };
    kv('Bộ tiêu chuẩn', ctx.codeName);
    kv('Vật liệu', ctx.matName + ' (' + ctx.matKind + ', ' + ctx.matForm + ')');
    kv('Phương trình', ctx.eq);
    kv('Tham chiếu', ctx.ref);
    if (ctx.matBlocked) {
      sh.merge(r, 1, r, NC);
      sh.text(r, 1, 'CẢNH BÁO: vật liệu này KHÔNG dùng được ở nhiệt độ thiết kế ' +
        ctx.T + ' °C (mốc của vật liệu: ' + ctx.matMinTemp + ' °C).', S.NO);
      r++;
    }
    r++;

    /* ---------- 2. thông số đầu vào ---------- */
    sh.text(r, 1, '2. THÔNG SỐ ĐẦU VÀO', S.SECTION);
    r++;
    const par = (sym, desc, val, unit, numeric, style) => {
      sh.text(r, 1, sym, S.BOLD);
      sh.merge(r, 2, r, 8);
      sh.text(r, 2, desc, S.NORMAL);
      if (numeric) sh.num(r, 9, val, style || S.N2);
      else sh.text(r, 9, val, S.CELL);
      sh.text(r, 10, unit || '', S.NORMAL);
      r++;
    };
    par('P', 'Áp suất thiết kế bên trong', ctx.P, 'MPa', true, S.N3);
    par('T', 'Nhiệt độ thiết kế', ctx.T, '°C', true, S.N1);
    if (ctx.codeKey === 'b31_8') {
      par('S', 'SMYS của vật liệu', ctx.SMYS, 'MPa', true);
      par('F', 'Hệ số thiết kế theo Class Location', ctx.F, '', true);
      par('T', 'Hệ số giảm nhiệt độ', ctx.Tf, '', true);
    } else {
      par('S', 'Ứng suất cho phép ở nhiệt độ thiết kế', ctx.S, 'MPa', true);
      sh.merge(r, 2, r, 10);
      sh.text(r, 2, 'nguồn: ' + (ctx.Ssource || '—') + ' · ' + (ctx.Snote || ''),
              S.SMALL);
      r++;
      par('Y', 'Hệ số vật liệu (ASME B31.3, Bảng 304.1.1)', ctx.Y, '', true, S.N3);
    }
    par('E', 'Hệ số chất lượng mối nối (Bảng A-1A / A-1B)', ctx.E, '', true);
    if (ctx.codeKey === 'b31_3') {
      par('W', 'Hệ số giảm bền mối hàn (Bảng 302.3.5)', ctx.W, '', true);
    }
    par('c', 'Dư ăn mòn, chiều sâu ren và rãnh', ctx.c, 'mm', true);
    par('', 'Dung sai chế tạo ống', ctx.tol * 100, '%', true, S.N1);
    if (ctx.structMin > 0) {
      par('', 'Chiều dày tối thiểu về kết cấu (yêu cầu dự án)',
          ctx.structMin, 'mm', true);
    }
    r++;

    /* ---------- 3. kết quả ---------- */
    sh.text(r, 1, '3. KẾT QUẢ', S.SECTION);
    r++;
    const h1 = r, h2 = r + 1;
    const head = [
      [1, 'Kích cỡ\n(NPS)'], [2, 'DN'], [3, 'D₀\n[mm]'], [4, 't\n[mm]'],
      [5, 'tₘ = t+c\n[mm]'], [6, 'Đặt hàng\ntối thiểu [mm]'],
      [9, 'T′\n[mm]'], [10, 'MAWP\n[MPa]'], [11, 'Kết quả'],
      [12, 'Kiểm tra\n(t < D₀/6)']
    ];
    for (const [c, t] of head) {
      sh.merge(h1, c, h2, c);
      sh.text(h1, c, t, S.HEADER);
      sh.text(h2, c, '', S.HEADER);
    }
    sh.merge(h1, 7, h1, 8);
    sh.text(h1, 7, 'T_nom đã chọn', S.HEADER);
    sh.text(h1, 8, '', S.HEADER);
    sh.text(h2, 7, 'Chiều dày', S.HEADER);
    sh.text(h2, 8, 'Schedule', S.HEADER);
    sh.height(h1, 26);
    sh.height(h2, 15);
    r = h2 + 1;

    for (const row of rows) {
      if (row.error) {
        sh.text(r, 1, row.nps, S.CELL);
        sh.merge(r, 2, r, NC);
        sh.text(r, 2, 'LỖI: ' + row.error, S.NO);
        r++;
        continue;
      }
      const ch = row.chosen;
      sh.text(r, 1, row.nps, S.CELL);
      sh.num(r, 2, row.DN, S.CELL);
      sh.num(r, 3, row.Do, S.N1);
      sh.num(r, 4, row.t, S.N3);
      sh.num(r, 5, row.tm, S.N2);
      sh.num(r, 6, row.tOrder, S.N2);
      if (ch) {
        sh.num(r, 7, ch.Tnom, S.HILITE);
        sh.text(r, 8, ch.sched, S.HILITE);
        sh.num(r, 9, ch.Tprime, S.N3);
        sh.num(r, 10, ch.Pmax, S.N2);
      } else {
        for (const c of [7, 8, 9, 10]) sh.text(r, c, '—', S.CELL);
      }
      sh.text(r, 11, ch ? 'Đạt' : 'Không đạt', ch ? S.OK : S.NO);
      sh.text(r, 12, row.thick ? 'NO' : 'YES', row.thick ? S.NO : S.CELL);
      r++;
    }

    sh.merge(r, 1, r, NC);
    sh.text(r, 1, 'Đơn vị: mm, trừ cột MAWP [MPa]. “Đặt hàng tối thiểu” = ' +
      'tₘ / (1 − dung sai) — chiều dày danh nghĩa nhỏ nhất phải mua để sau ' +
      'dung sai chế tạo vẫn còn đủ tₘ.', S.SMALL);
    r += 2;

    /* ---------- 4. cảnh báo ---------- */
    if (warns && warns.length) {
      sh.text(r, 1, '4. CẢNH BÁO VÀ GHI CHÚ', S.SECTION);
      r++;
      const mark = { bad: '[QUAN TRỌNG]', warn: '[LƯU Ý]', info: '[thông tin]' };
      warns.forEach((it, i) => {
        sh.merge(r, 1, r, NC);
        sh.text(r, 1, (i + 1) + '. ' + (mark[it.w.lv] || '') + ' ' +
          (it.nps && it.nps.length ? '(NPS ' + it.nps.join(', ') + ') ' : '') +
          it.w.text + (it.w.basis ? '  [cơ sở: ' + it.w.basis + ']' : ''), S.WRAP);
        sh.height(r, 30);
        r++;
      });
      r++;
    }

    /* ---------- 5. giới hạn ---------- */
    sh.text(r, 1, '5. GIỚI HẠN CỦA KẾT QUẢ', S.SECTION);
    r++;
    for (const t of [
      'Chỉ tính chiều dày chịu áp suất bên trong. Chưa xét áp suất ngoài và chân ' +
      'không, tải trọng bền vững và tải thỉnh thoảng (§302.3, §304.1.1), ứng suất ' +
      'do giãn nở nhiệt, mỏi, và các bộ phận đặc biệt (rẽ nhánh, co, côn giảm, mặt bích).',
      'Ứng suất cho phép S do người lập nhập từ ASME B31.3 Bảng A-1; công cụ không ' +
      'kèm sẵn bảng này và không tự kiểm tra được trị số đã nhập.',
      'Bảng kích thước ống là dữ liệu tham khảo — phải đối chiếu ASME B36.10M / ' +
      'B36.19M bản hiện hành.',
      'Việc chọn vật liệu theo lưu chất và nhiệt độ là bước sàng lọc; yêu cầu thử ' +
      'va đập và giới hạn NACE phải tra tiêu chuẩn gốc.',
      'Hồ sơ phát hành phải được kỹ sư có thẩm quyền kiểm tra độc lập.'
    ]) {
      sh.merge(r, 1, r, NC);
      sh.text(r, 1, '• ' + t, S.WRAP);
      sh.height(r, 28);
      r++;
    }

    return X.build(sh, 'Chieu day thanh ong');
  }

  root.PTW.excel = { build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
