/* Lớp giao diện. */
(function () {
  'use strict';
  const P = window.PTW;
  const D = P.data, M = P.materials, C = P.calc, SEL = P.select, RP = P.report;

  const $ = id => document.getElementById(id);
  const el = (tag, a, kids) => {
    const n = document.createElement(tag);
    for (const k in (a || {})) {
      if (k === 'class') n.className = a[k];
      else if (k === 'text') n.textContent = a[k];
      else if (k === 'html') n.innerHTML = a[k];
      else n.setAttribute(k, a[k]);
    }
    for (const c of (kids || [])) n.appendChild(c);
    return n;
  };
  const num = (v, d) => {
    const x = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(x) ? x : (d === undefined ? 0 : d);
  };
  const opts = (s, arr, val) => {
    s.innerHTML = '';
    for (const v of arr) s.appendChild(el('option', { value: v, text: v }));
    if (val !== undefined && arr.indexOf(val) >= 0) s.value = val;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  let tt = null;
  function toast(m) {
    const t = $('toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function dialog(title, body) {
    $('dlg-title').textContent = title;
    $('dlg-body').innerHTML = ''; $('dlg-body').appendChild(body);
    $('dlg').showModal();
  }
  const errDlg = (t, m) => dialog(t, el('div',
    { style: 'white-space:pre-wrap;font-size:13px;color:var(--fg2)', text: m }));

  let LIB = [];
  let lastRows = null, lastCtx = null, lastWarns = null;

  /* ---------------- tabs ---------------- */
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]');
    if (!b) return;
    for (const x of $('tabs').children) x.classList.toggle('on', x === b);
    for (const p of document.querySelectorAll('.pane')) p.classList.toggle('on', p.id === b.dataset.p);
  });

  /* ---------------- thư viện vật liệu ---------------- */
  function loadLib() {
    const raw = store.get('ptw.lib');
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (Array.isArray(v) && v.length) { LIB = v; return; }
      } catch (e) {}
    }
    LIB = JSON.parse(JSON.stringify(M.SEED));
  }
  const saveLib = () => store.set('ptw.lib', JSON.stringify(LIB));
  const matById = id => LIB.find(m => m.id === id);

  function renderLib() {
    const box = $('lib');
    box.innerHTML = '';
    const missing = LIB.filter(m => !m.S || !m.S.length).length;
    $('libbanner').innerHTML = '<b>' + (LIB.length - missing) + '/' + LIB.length +
      '</b> vật liệu đã có ứng suất cho phép. Vật liệu chưa nhập S sẽ không tính được — ' +
      'đó là chủ ý, xem phần đầu <code>js/materials.js</code>.';

    for (const m of LIB) {
      const has = m.S && m.S.length;
      const head = el('div', { class: 'h' }, [
        el('b', { text: m.name }),
        el('span', { class: 'kind', text: m.kind + ' · ' + m.form +
          ' · T_min ' + m.minTemp + ' °C' })
      ]);
      const src = el('div', { class: 'srcline' + (has ? '' : ' none'),
        text: 'Nguồn S: ' + (m.source || '—') });
      const pts = el('div', { style: 'margin-top:7px' });
      const tbl = el('table', { class: 'tbl' });
      tbl.innerHTML = '<thead><tr><th>Nhiệt độ [°C]</th><th>S [MPa]</th><th></th></tr></thead>';
      const tb = el('tbody');
      (m.S || []).forEach((pt, i) => {
        const tr = el('tr');
        const tdT = el('td', { class: 'num' });
        const iT = el('input', { value: pt[0] });
        iT.onchange = () => { m.S[i][0] = num(iT.value); saveLib(); refreshMat(); };
        tdT.appendChild(iT); tr.appendChild(tdT);
        const tdS = el('td', { class: 'num' });
        const iS = el('input', { value: pt[1] });
        iS.onchange = () => { m.S[i][1] = num(iS.value); saveLib(); refreshMat(); };
        tdS.appendChild(iS); tr.appendChild(tdS);
        const tdD = el('td');
        const b = el('button', { class: 'tiny del', text: '×' });
        b.onclick = () => { m.S.splice(i, 1); saveLib(); renderLib(); refreshMat(); };
        tdD.appendChild(b); tr.appendChild(tdD);
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      pts.appendChild(tbl);

      const addb = el('button', { class: 'tiny ghost', text: '+ Thêm điểm nhiệt độ' });
      addb.onclick = () => {
        m.S = m.S || [];
        m.S.push([38, 0]);
        m.source = 'do người dùng nhập';
        saveLib(); renderLib(); refreshMat();
      };
      const srcb = el('button', { class: 'tiny ghost', text: 'Sửa ghi chú nguồn' });
      srcb.onclick = () => {
        const v = prompt('Nguồn của các trị số S (ví dụ: ASME B31.3-2022 Bảng A-1, ' +
          'trang …):', m.source || '');
        if (v !== null) { m.source = v; saveLib(); renderLib(); }
      };
      const card = el('div', { class: 'mat' }, [head, src, pts,
        el('div', { style: 'margin-top:6px;display:flex;gap:6px' }, [addb, srcb])]);
      if (m.warn) card.appendChild(el('div', { class: 'issue warn', text: m.warn }));
      box.appendChild(card);
    }
  }

  /* ---------------- tab 1 ---------------- */
  function codeInfo() { return D.CODES[$('code').value]; }
  const codeChosen = () => !!codeInfo();

  /* Chưa chọn bộ tiêu chuẩn thì khoá toàn bộ phần sau: mỗi bộ dùng phương trình
     và bộ hệ số khác nhau, tính trước khi chọn là vô nghĩa. */
  function applyGate() {
    const ok = codeChosen();
    for (const id of ['btn-run', 'btn-pdf', 'btn-report']) $(id).disabled = !ok;
    for (const el of document.querySelectorAll(
        '#p1 .card:not(#card-code), #p2, #p3, #p5')) {
      el.classList.toggle('locked', !ok);
    }
    let hint = $('gate-hint');
    if (!ok) {
      if (!hint) {
        hint = el('div', { class: 'needcode', id: 'gate-hint',
          text: '⟵ Chọn bộ tiêu chuẩn thiết kế ở Bước 1 để mở các bước còn lại.' });
        $('card-code').after(hint);
      }
    } else if (hint) {
      hint.remove();
    }
  }

  function onCode() {
    const ci = codeInfo();
    applyGate();
    if (!ci) {
      $('eqbox').textContent = 'Chưa chọn bộ tiêu chuẩn.';
      return;
    }
    $('eqbox').innerHTML = '';
    $('eqbox').appendChild(document.createTextNode(ci.eq));
    $('eqbox').appendChild(el('span', { class: 'ref',
      text: ci.ref + ' — ' + ci.note }));
    const isB8 = ci.key === 'b31_8';
    $('wrap-F').style.display = isB8 ? '' : 'none';
    $('wrap-Tf').style.display = isB8 ? '' : 'none';
    $('W').parentElement.style.display = ci.key === 'b31_3' ? '' : 'none';
    $('Y').parentElement.style.display = isB8 ? 'none' : '';
  }

  function onTemp() {
    const T = num($('T').value);
    const mat = matById($('mat').value);
    const g = mat ? mat.group : 'ferritic';
    const y = M.coefficientY(g, T);
    if (y.auto) {
      $('Y').value = y.Y;
      $('Y').removeAttribute('data-manual');
      $('ynote').textContent = 'Y = 0,4 tự động — ' + y.note;
    } else {
      $('ynote').textContent = y.note;
    }
    refreshScreen();
  }

  /* ---------------- tab 2 ---------------- */
  function refreshMat() {
    const mat = matById($('mat').value);
    if (!mat) return;
    const T = num($('T').value);
    const a = M.allowableStress(mat, T);
    $('mat-src').textContent = 'Nguồn S: ' + (mat.source || '—');
    $('mat-src').className = 'srcline' + (a.S ? '' : ' none');
    $('E').value = mat.E;
    const k = $('mat-kpi');
    k.innerHTML = '';
    const add = (n, kk) => k.appendChild(el('div', {}, [
      el('div', { class: 'n', text: n }), el('div', { class: 'k', text: kk })]));
    add(a.S ? a.S.toFixed(1) : '—', 'S tại ' + T + ' °C [MPa]');
    add(mat.minTemp + ' °C', 'Nhiệt độ thấp nhất');
    add(mat.E.toFixed(2), 'E — hệ số mối nối');
    add(mat.group === 'austenitic' ? 'Austenit' : (mat.group === 'ferritic' ? 'Ferrit' : '—'),
        'Nhóm (cho hệ số Y)');
    if (!a.S) {
      k.appendChild(el('div', { style: 'grid-column:1/-1' }, [
        el('div', { class: 'k', style: 'color:var(--bad)',
          text: 'Chưa nhập S — sang tab 4 để nhập trước khi tính.' })]));
    } else if (a.note.indexOf('VƯỢT') >= 0 || a.note.indexOf('CAO HƠN') >= 0) {
      k.appendChild(el('div', { style: 'grid-column:1/-1' }, [
        el('div', { class: 'k', style: 'color:var(--flame)', text: a.note })]));
    }
    refreshScreen();
  }

  function refreshScreen() {
    const fl = D.FLUIDS[$('fluid').value];
    const T = num($('T').value);
    const box = $('screen');
    box.innerHTML = '';
    for (const { mat, res } of M.bestFor(fl, T, LIB)) {
      const head = el('div', { class: 'h' }, [
        el('b', { text: mat.name }),
        el('span', { class: 'kind', text: mat.kind + ' · T_min ' + mat.minTemp + ' °C' }),
        el('span', { class: 'badge ' + (res.ok ? 'ok' : 'no'),
          text: res.ok ? 'dùng được' : 'KHÔNG phù hợp' })
      ]);
      const card = el('div', { class: 'mat' }, [head]);
      for (const is of res.issues) {
        card.appendChild(el('div', { class: 'issue ' + is.lv }, [
          document.createTextNode(is.text + ' '),
          is.basis ? el('span', { class: 'basis', text: '[' + is.basis + ']' })
                   : document.createTextNode('')
        ]));
      }
      if (!res.issues.length) {
        card.appendChild(el('div', { class: 'issue info',
          text: 'Không có cảnh báo nào từ bộ quy tắc sàng lọc.' }));
      }
      box.appendChild(card);
    }
  }

  /* ---------------- tính ---------------- */
  function npsRange() {
    const list = D.NPS_LIST;
    const a = list.indexOf($('npsFrom').value);
    const b = list.indexOf($('npsTo').value);
    if (a < 0 || b < 0) return list;
    return a <= b ? list.slice(a, b + 1) : list.slice(b, a + 1);
  }

  function run() {
    const ci = codeInfo();
    if (!ci) {
      errDlg('Chưa chọn bộ tiêu chuẩn',
        'Phải chọn bộ tiêu chuẩn thiết kế ở Bước 1 trước khi tính chiều dày.' +
        '\n\nMỗi bộ dùng một phương trình khác nhau:' +
        '\n  • B31.3   t = P·D / (2(S·E·W + P·Y))    — S lấy từ Bảng A-1' +
        '\n  • B31.1   tm = P·D / (2(S·E + P·y)) + A' +
        '\n  • B31.8   t = P·D / (2·S·F·E·T)         — S là SMYS, F theo Class Location');
      document.querySelector('#tabs button[data-p=p1]').click();
      $('code').focus();
      return;
    }
    const mat = matById($('mat').value);
    const T = num($('T').value);
    const fl = D.FLUIDS[$('fluid').value];

    const base = {
      codeKey: ci.key,
      P: num($('P').value), c: num($('c').value),
      tol: num($('tol').value) / 100,
      E: num($('E').value), W: num($('W').value), Y: num($('Y').value),
      structMin: num($('structmin').value)
    };

    const ctx = {
      codeKey: ci.key, codeName: $('code').value, eq: ci.eq, ref: ci.ref,
      P: base.P, T: T, c: base.c, tol: base.tol, structMin: base.structMin,
      E: base.E, W: base.W, Y: base.Y,
      matName: mat.name, matKind: mat.kind, matForm: mat.form,
      matMinTemp: mat.minTemp, fluidName: $('fluid').value
    };

    if (ci.key === 'b31_8') {
      if (!(mat.SMYS > 0)) {
        errDlg('Thiếu SMYS', 'ASME B31.8 dùng SMYS chứ không dùng ứng suất cho phép ' +
          'của Bảng A-1. Vật liệu "' + mat.name + '" chưa khai báo SMYS.\n\n' +
          'Chọn một mác API 5L, hoặc thêm SMYS vào thư viện.');
        return;
      }
      base.SMYS = mat.SMYS;
      base.F = D.B31_8_F[$('F').value];
      base.Tf = num($('Tf').value, 1);
      ctx.SMYS = base.SMYS; ctx.F = base.F; ctx.Tf = base.Tf;
    } else {
      const a = M.allowableStress(mat, T);
      if (!a.S) {
        errDlg('Chưa có ứng suất cho phép',
          'Vật liệu "' + mat.name + '" chưa có trị số S.\n\n' +
          'Sang tab "4· Thư viện ứng suất S", thêm ít nhất một điểm ' +
          '(nhiệt độ : S) lấy từ ASME B31.3 Bảng A-1 ở nhiệt độ thiết kế.\n\n' +
          'Công cụ cố ý không kèm sẵn Bảng A-1: nhập sai S thì ra ống mỏng hơn ' +
          'mức an toàn và không phép kiểm tra nào phía sau phát hiện được.');
        return;
      }
      base.S = a.S;
      ctx.S = a.S; ctx.Ssource = mat.source || '—'; ctx.Snote = a.note;
      const y = M.coefficientY(mat.group, T);
      ctx.Ynote = y.auto ? y.note : 'nhập tay — ' + y.note;
    }

    let rows;
    try {
      rows = SEL.runRange(base, npsRange(), $('schedmode').value || null);
    } catch (exc) { errDlg('Lỗi khi tính', exc.message); return; }

    /* cảnh báo cấp vật liệu/lưu chất */
    const scr = M.screen(mat, fl, T);
    const extra = scr.issues.map(i => ({ w: { lv: i.lv, text: i.text, basis: i.basis },
                                         nps: [] }));
    const warns = extra.concat(SEL.collectWarnings(rows));

    ctx.matBlocked = !scr.ok;
    lastRows = rows; lastCtx = ctx; lastWarns = warns;
    showResult(ctx, rows, warns);
    document.querySelector('#tabs button[data-p=p3]').click();
    saveInputs();
  }

  function showResult(ctx, rows, warns) {
    const okRows = rows.filter(r => r.chosen);
    const bad = rows.filter(r => !r.chosen && !r.error);
    const v = $('verdict');
    const thickOk = bad.length === 0 && !rows.some(r => r.error);
    // Chiều dày đạt mà vật liệu không dùng được ở nhiệt độ thiết kế thì tổng
    // thể vẫn KHÔNG ĐẠT — không được để kết luận "ĐẠT" che mất điều đó.
    const allOk = thickOk && !ctx.matBlocked;
    v.className = 'verdict ' + (allOk ? 'ok' : 'no');
    if (ctx.matBlocked) {
      v.textContent = 'KHÔNG ĐẠT — vật liệu không dùng được ở nhiệt độ thiết kế' +
        (thickOk ? ' (chiều dày thì đủ)' : ', và ' + bad.length + ' kích cỡ thiếu chiều dày');
    } else {
      v.textContent = thickOk
        ? ('ĐẠT — chọn được ống cho cả ' + rows.length + ' kích cỡ')
        : ('CÓ ' + bad.length + '/' + rows.length + ' KÍCH CỠ KHÔNG CHỌN ĐƯỢC ỐNG');
    }

    $('verdict-sub').textContent = ctx.codeName + ' · P = ' + ctx.P + ' MPa · T = ' +
      ctx.T + ' °C · c = ' + ctx.c + ' mm · dung sai ' + (ctx.tol * 100).toFixed(1) +
      ' % · ' + ctx.matName +
      (ctx.S !== undefined ? (' · S = ' + ctx.S.toFixed(1) + ' MPa') : '');

    const k = $('kpi'); k.innerHTML = '';
    const add = (n, kk) => k.appendChild(el('div', {}, [
      el('div', { class: 'n', text: n }), el('div', { class: 'k', text: kk })]));
    const tmax = Math.max.apply(null, rows.map(r => r.t || 0));
    const minM = okRows.length ? Math.min.apply(null, okRows.map(r => r.chosen.margin)) : 0;
    const minP = okRows.length ? Math.min.apply(null, okRows.map(r => r.chosen.Pmax)) : 0;
    add(tmax.toFixed(3), 't lớn nhất trong dải [mm]');
    add(ctx.c.toFixed(2), 'dư ăn mòn c [mm]');
    add(okRows.length ? minM.toFixed(2) : '—', 'dư mỏng nhất [mm]');
    add(okRows.length ? minP.toFixed(1) : '—', 'MAWP thấp nhất [MPa]');

    const tb = $('res').tBodies[0];
    tb.innerHTML = '';
    for (const r of rows) {
      if (r.error) {
        const tr = el('tr', { class: 'bad' });
        tr.appendChild(el('td', { text: r.nps }));
        const td = el('td', { colspan: '12', text: 'LỖI: ' + r.error });
        tr.appendChild(td); tb.appendChild(tr); continue;
      }
      const ch = r.chosen;
      const tr = el('tr', { class: ch ? 'picked' : 'bad' }, [
        el('td', { text: r.nps }), el('td', { text: r.DN }),
        el('td', { text: r.Do.toFixed(1) }), el('td', { text: r.t.toFixed(3) }),
        el('td', { text: r.tm.toFixed(2) }), el('td', { text: r.tOrder.toFixed(2) }),
        el('td', { text: ch ? ch.sched : '—' }),
        el('td', { text: ch ? ch.Tnom.toFixed(2) : '—' }),
        el('td', { text: ch ? ch.Tprime.toFixed(3) : '—' }),
        el('td', { text: ch ? ch.margin.toFixed(2) : '—' }),
        el('td', { text: ch ? ch.Pmax.toFixed(2) : '—' })
      ]);
      tr.appendChild(el('td', { class: ch ? 'pass' : 'fail',
        text: ch ? 'ĐẠT' : 'KHÔNG ĐẠT' }));
      tr.appendChild(el('td', { class: r.thick ? 'fail' : 'pass',
        text: r.thick ? 'KHÔNG' : 'CÓ' }));
      tb.appendChild(tr);
    }

    const wb = $('warns'); wb.innerHTML = '';
    if (!warns.length) {
      wb.appendChild(el('p', { class: 'note', text: 'Không có cảnh báo nào.' }));
    }
    const cls = { bad: 'lv-hi', warn: 'lv-mid', info: 'lv-info' };
    const advBox = el('div', { class: 'adv' });
    for (const it of warns) {
      advBox.appendChild(el('div', { class: 'item ' + (cls[it.w.lv] || '') }, [
        el('div', { class: 't', text: '● ' + (it.nps.length
          ? '(NPS ' + it.nps.join(', ') + ') ' : '') + it.w.text }),
        el('div', { class: 'b', text: it.w.basis ? 'Cơ sở: ' + it.w.basis : '' })
      ]));
    }
    wb.appendChild(advBox);

    $('report').textContent = RP.build(ctx, rows, warns);
  }

  /* ---------------- tự kiểm chứng ---------------- */
  function runVerify() {
    const rows = P.verify.runVerification();
    const tbl = el('table', { class: 'rtbl' });
    tbl.innerHTML = '<thead><tr><th>Phép kiểm tra</th><th>Công cụ</th>' +
      '<th>Tính tay</th><th>KQ</th></tr></thead>';
    const tb = el('tbody');
    let bad = 0;
    for (const r of rows) {
      if (!r.ok) bad++;
      tb.appendChild(el('tr', { class: r.ok ? '' : 'bad' }, [
        el('td', { text: r.name }),
        el('td', { text: Number(r.got).toPrecision(6) }),
        el('td', { text: Number(r.want).toPrecision(6) }),
        el('td', { html: r.ok ? '<span class="badge ok">đạt</span>'
                              : '<span class="badge no">SAI</span>' })
      ]));
    }
    tbl.appendChild(tb);
    dialog('Tự kiểm chứng — ' + (bad ? bad + ' phép SAI' : 'tất cả ' + rows.length + ' phép đều đạt'),
      el('div', {}, [
        el('p', { class: 'note', text: 'Chạy lại một bài toán B31.3 mẫu và so với kết ' +
          'quả tính tay, cộng kiểm tra tính nhất quán: MAWP phải đảo ngược đúng phương ' +
          'trình, nhánh thành dày t ≥ D₀/6 phải tự nhất quán, nội suy S, và việc thiếu ' +
          'S phải báo lỗi chứ không tính bừa.' }),
        tbl
      ]));
  }

  /* ---------------- xuất PDF ---------------- */
  const META_IDS = ['m-project', 'm-item', 'm-client', 'm-company', 'm-docno',
                    'm-rev', 'm-date', 'm-by', 'm-checked', 'm-approved'];
  function meta() {
    return {
      project: $('m-project').value, item: $('m-item').value,
      client: $('m-client').value, company: $('m-company').value,
      docNo: $('m-docno').value, rev: $('m-rev').value,
      date: $('m-date').value || new Date().toLocaleDateString('vi-VN'),
      by: $('m-by').value, checked: $('m-checked').value,
      approved: $('m-approved').value
    };
  }
  function exportPDF() {
    if (!lastRows) { toast('Bấm TÍNH trước đã.'); return; }
    $('sheet').innerHTML = P.sheet.build(meta(), lastCtx, lastRows, lastWarns);
    // để trình duyệt kịp dựng lại bố cục trước khi mở hộp thoại in
    setTimeout(() => window.print(), 60);
  }

  /* ---------------- xuất / nhập ---------------- */
  function dl(name, text, type) {
    const b = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(b), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function exportLib() {
    dl('thu_vien_ung_suat.json', JSON.stringify(LIB, null, 2), 'application/json');
    toast('Đã xuất thư viện.');
  }
  function importLib(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const v = JSON.parse(rd.result);
        if (!Array.isArray(v)) throw new Error('File không phải danh sách vật liệu.');
        LIB = v; saveLib(); renderLib(); fillMatSelect(); refreshMat();
        toast('Đã nhập ' + v.length + ' vật liệu.');
      } catch (e) { errDlg('Không đọc được file', e.message); }
    };
    rd.readAsText(file);
  }

  /* ---------------- lưu ô nhập ---------------- */
  const IDS = ['code', 'P', 'T', 'c', 'tolsel', 'tol', 'structmin', 'E', 'W', 'Y',
               'F', 'Tf', 'npsFrom', 'npsTo', 'schedmode', 'fluid', 'mat',
               'm-project', 'm-item', 'm-client', 'm-company', 'm-docno',
               'm-rev', 'm-date', 'm-by', 'm-checked', 'm-approved'];
  function saveInputs() {
    const o = {};
    for (const id of IDS) if ($(id)) o[id] = $(id).value;
    store.set('ptw.in', JSON.stringify(o));
  }
  function loadInputs() {
    try {
      const o = JSON.parse(store.get('ptw.in') || '{}');
      for (const id of IDS) if ($(id) && o[id] !== undefined) $(id).value = o[id];
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- khởi tạo ---------------- */
  function fillMatSelect() {
    const cur = $('mat').value;
    opts($('mat'), LIB.map(m => m.id));
    for (const o of $('mat').options) {
      const m = matById(o.value);
      o.textContent = m.name + '  (' + m.kind + ')';
    }
    if (LIB.some(m => m.id === cur)) $('mat').value = cur;
  }

  function init() {
    loadLib();

    $('code').innerHTML = '';
    $('code').appendChild(el('option', { value: '', text: '— Chọn bộ tiêu chuẩn thiết kế —' }));
    for (const k of Object.keys(D.CODES)) {
      $('code').appendChild(el('option', { value: k, text: k }));
    }
    opts($('tolsel'), Object.keys(D.MILL_TOLERANCE), 'Ống đúc (SMLS) — 12,5%');
    opts($('F'), Object.keys(D.B31_8_F), 'Class 1, Division 2 — F = 0,72');
    opts($('fluid'), Object.keys(D.FLUIDS), 'LNG (lỏng, −162 °C)');
    opts($('npsFrom'), D.NPS_LIST, '1/2');
    opts($('npsTo'), D.NPS_LIST, '10');
    const scheds = [''].concat(D.SCHED_ORDER);
    $('schedmode').innerHTML = '';
    $('schedmode').appendChild(el('option', { value: '', text: 'Tự chọn nhẹ nhất còn đạt' }));
    for (const s of D.SCHED_ORDER) {
      $('schedmode').appendChild(el('option', { value: s, text: 'Ép dùng ' + s }));
    }
    fillMatSelect();
    $('mat').value = 'a312_304';

    $('code').onchange = () => { onCode(); saveInputs(); };
    $('tolsel').onchange = () => {
      const v = D.MILL_TOLERANCE[$('tolsel').value];
      if (v !== null) $('tol').value = (v * 100).toFixed(1);
    };
    $('T').onchange = () => { onTemp(); refreshMat(); saveInputs(); };
    $('mat').onchange = () => { refreshMat(); onTemp(); saveInputs(); };
    $('fluid').onchange = () => {
      $('fluid-note').textContent = D.FLUIDS[$('fluid').value].note || '';
      refreshScreen(); saveInputs();
    };
    $('btn-usetemp').onclick = () => {
      $('T').value = D.FLUIDS[$('fluid').value].typicalT;
      onTemp(); refreshMat(); toast('Đã đặt nhiệt độ thiết kế.');
    };
    $('btn-run').onclick = run;
    $('btn-verify').onclick = runVerify;
    $('btn-export').onclick = exportLib;
    $('btn-pdf').onclick = exportPDF;
    $('btn-report').onclick = () => {
      if (!lastRows) { toast('Bấm TÍNH trước đã.'); return; }
      dl('tinh_toan_chieu_day_ong.txt', $('report').textContent);
      toast('Đã tải báo cáo.');
    };
    $('btn-import').onclick = () => $('file-import').click();
    $('file-import').onchange = e => { if (e.target.files[0]) importLib(e.target.files[0]); };
    $('btn-reset').onclick = () => {
      if (!confirm('Khôi phục thư viện về mặc định? Các trị số S bạn đã nhập sẽ mất.')) return;
      LIB = JSON.parse(JSON.stringify(M.SEED));
      saveLib(); renderLib(); fillMatSelect(); refreshMat();
      toast('Đã khôi phục.');
    };
    for (const id of ['P', 'c', 'E', 'W', 'Y', 'structmin', 'tol', 'npsFrom', 'npsTo',
                      'schedmode', 'F', 'Tf'].concat(META_IDS)) {
      if ($(id)) $(id).onchange = saveInputs;
    }
    if (!$('m-date').value) {
      $('m-date').value = new Date().toLocaleDateString('vi-VN');
    }

    loadInputs();
    onCode();
    $('fluid-note').textContent = D.FLUIDS[$('fluid').value].note || '';
    renderLib();
    refreshMat();
    onTemp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
