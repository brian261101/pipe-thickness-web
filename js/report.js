/* Xuất báo cáo tính toán chiều dày thành ống. */
(function (root) {
  'use strict';
  const D = root.PTW.data;

  const LINE = '='.repeat(96);
  const THIN = '-'.repeat(96);
  const pad = (s, n) => String(s).padEnd(n);
  const lp = (s, n) => String(s).padStart(n);

  function wrap(t, w) {
    const words = String(t).split(/\s+/);
    const out = []; let cur = '';
    for (const x of words) {
      if (cur.length + x.length + 1 > w) { out.push(cur); cur = x; }
      else cur = cur ? cur + ' ' + x : x;
    }
    if (cur) out.push(cur);
    return out;
  }

  function build(ctx, rows, warns) {
    const o = [];
    o.push('\n' + LINE + '\nTÍNH TOÁN CHIỀU DÀY THÀNH ỐNG\n' + LINE + '\n\n');
    o.push('Lập lúc      : ' + new Date().toLocaleString('vi-VN') + '\n');
    o.push('Bộ tiêu chuẩn: ' + ctx.codeName + '\n');
    o.push('Phương trình : ' + ctx.eq + '\n');
    o.push('Tham chiếu   : ' + ctx.ref + '\n');

    o.push('\n1. ĐIỀU KIỆN THIẾT KẾ\n' + THIN + '\n');
    o.push('P   Áp suất thiết kế bên trong          = ' + ctx.P.toFixed(3) + ' MPa\n');
    o.push('T   Nhiệt độ thiết kế                   = ' + ctx.T.toFixed(1) + ' °C\n');
    o.push('c   Dư ăn mòn / ren / rãnh              = ' + ctx.c.toFixed(2) + ' mm\n');
    o.push('    Dung sai chế tạo                    = ' + (ctx.tol * 100).toFixed(1) + ' %\n');
    if (ctx.structMin > 0) {
      o.push('    Chiều dày tối thiểu kết cấu         = ' + ctx.structMin.toFixed(2) + ' mm\n');
    }

    o.push('\n2. VẬT LIỆU\n' + THIN + '\n');
    o.push('Vật liệu     : ' + ctx.matName + '  (' + ctx.matKind + ', ' + ctx.matForm + ')\n');
    o.push('Lưu chất     : ' + ctx.fluidName + '\n');
    if (ctx.codeKey === 'b31_8') {
      o.push('SMYS         = ' + ctx.SMYS.toFixed(1) + ' MPa\n');
      o.push('F            = ' + ctx.F.toFixed(2) + '   (Class Location)\n');
      o.push('T (nhiệt độ) = ' + ctx.Tf.toFixed(2) + '\n');
    } else {
      o.push('S            = ' + ctx.S.toFixed(2) + ' MPa\n');
      o.push('  nguồn      : ' + ctx.Ssource + '\n');
      o.push('  cách lấy   : ' + ctx.Snote + '\n');
      o.push('Y            = ' + ctx.Y.toFixed(3) + '   ' + (ctx.Ynote || '') + '\n');
    }
    o.push('E            = ' + ctx.E.toFixed(2) + '\n');
    if (ctx.codeKey === 'b31_3') o.push('W            = ' + ctx.W.toFixed(2) + '\n');
    if (ctx.matBlocked) {
      o.push('\n*** CẢNH BÁO: vật liệu này KHÔNG dùng được ở nhiệt độ thiết kế. ***\n');
    }
    o.push('Giới hạn nhiệt độ thấp của vật liệu: ' +
      (ctx.matMinTemp !== undefined ? ctx.matMinTemp + ' °C' : 'chưa khai báo') + '\n');

    o.push('\n3. BẢNG TÍNH THEO KÍCH CỠ\n' + THIN + '\n');
    o.push(pad('NPS', 7) + lp('DN', 5) + lp('Do', 9) + lp('t', 9) + lp('tm', 9) +
      lp('Đặt≥', 9) + '  ' + pad('Sched', 9) + lp('Tnom', 8) + lp("T'", 8) +
      lp('Dư', 8) + lp('MAWP', 9) + '  ' + pad('KQ', 8) + 't<Do/6\n');
    for (const r of rows) {
      if (r.error) { o.push(pad(r.nps, 7) + '  LỖI: ' + r.error + '\n'); continue; }
      const ch = r.chosen;
      o.push(pad(r.nps, 7) + lp(r.DN, 5) + lp(r.Do.toFixed(1), 9) +
        lp(r.t.toFixed(3), 9) + lp(r.tm.toFixed(2), 9) + lp(r.tOrder.toFixed(2), 9) +
        '  ' + pad(ch ? ch.sched : '—', 9) +
        lp(ch ? ch.Tnom.toFixed(2) : '—', 8) +
        lp(ch ? ch.Tprime.toFixed(3) : '—', 8) +
        lp(ch ? ch.margin.toFixed(2) : '—', 8) +
        lp(ch ? ch.Pmax.toFixed(2) : '—', 9) +
        '  ' + pad(ch ? 'ĐẠT' : 'KHÔNG ĐẠT', 8) + (r.thick ? 'KHÔNG' : 'CÓ') + '\n');
    }

    o.push('\nGiải thích cột:\n');
    o.push('  t      chiều dày chịu áp suất bên trong\n');
    o.push('  tm     chiều dày tối thiểu yêu cầu = t + c\n');
    o.push('  Đặt≥   chiều dày danh nghĩa tối thiểu phải ĐẶT HÀNG = tm / (1 − dung sai)\n');
    o.push("  T'     chiều dày còn lại sau khi trừ dung sai chế tạo = Tnom × (1 − dung sai)\n");
    o.push("  Dư     T' − tm, phần dư so với yêu cầu\n");
    o.push('  MAWP   áp suất lớn nhất cho phép của ống đã chọn, tính ngược từ cùng phương trình\n');

    if (warns && warns.length) {
      o.push('\n4. CẢNH BÁO VÀ GHI CHÚ\n' + THIN + '\n');
      const mark = { bad: '[QUAN TRỌNG]', warn: '[LƯU Ý]     ', info: '[thông tin] ' };
      for (const it of warns) {
        o.push((mark[it.w.lv] || '            ') + ' ' +
          (it.nps.length ? '(NPS ' + it.nps.join(', ') + ') ' : '') + '\n');
        for (const l of wrap(it.w.text, 84)) o.push('              ' + l + '\n');
        if (it.w.basis) o.push('              cơ sở: ' + it.w.basis + '\n');
        o.push('\n');
      }
    }

    o.push('\nGIỚI HẠN CỦA KẾT QUẢ\n' + THIN + '\n');
    for (const p of [
      'Kết quả trên chỉ là chiều dày chịu ÁP SUẤT BÊN TRONG theo phương trình của bộ ' +
      'tiêu chuẩn đã chọn. Chưa xét: áp suất ngoài và chân không, tải trọng bền vững ' +
      'và tải thỉnh thoảng (§302.3, §304.1.1), ứng suất do giãn nở nhiệt, mỏi, rung, ' +
      'và các bộ phận đặc biệt như chỗ rẽ nhánh, co, côn giảm, mặt bích.',
      'Ứng suất cho phép S do người dùng nhập. Công cụ không kèm Bảng A-1 và không ' +
      'kiểm tra được trị số bạn nhập có đúng mác, dạng sản phẩm và nhiệt độ hay không.',
      'Bảng kích thước ống là dữ liệu tham khảo — phải đối chiếu ASME B36.10M / ' +
      'B36.19M bản hiện hành.',
      'Việc chọn vật liệu theo lưu chất và nhiệt độ trong công cụ này là bước SÀNG ' +
      'LỌC. Yêu cầu thử va đập, giới hạn NACE, và tương thích hoá học phải tra tiêu ' +
      'chuẩn gốc cho từng trường hợp.',
      'Hồ sơ thiết kế phát hành phải được kỹ sư có thẩm quyền kiểm tra độc lập.'
    ]) {
      for (const l of wrap(p, 92)) o.push('  ' + l + '\n');
      o.push('\n');
    }
    return o.join('');
  }

  root.PTW = root.PTW || {};
  root.PTW.report = { build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
