/* Dựng "tờ tính toán" để in ra PDF.

   Dùng chính bộ in của trình duyệt (Ctrl+P → Lưu thành PDF) nên PDF có chữ
   chọn/tìm được, tiếng Việt hiển thị đúng, và không phải nhúng thư viện nào.
   Bố cục theo đúng dạng một tờ tính toán kỹ thuật: khung tên, khối tham số
   ký hiệu : diễn giải : trị số, bảng kết quả, cảnh báo, chân trang. */
(function (root) {
  'use strict';

  const esc = s => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function paramRow(sym, desc, val, unit) {
    return '<tr><td class="sym">' + esc(sym) + '</td><td class="dsc">' + esc(desc) +
      '</td><td class="val">' + esc(val) + '</td><td class="unt">' + esc(unit || '') +
      '</td></tr>';
  }

  /* meta: { project, item, docNo, rev, by, checked, approved, date, client } */
  function build(meta, ctx, rows, warns) {
    const h = [];

    h.push('<div class="sh-title">');
    h.push('<table class="sh-tb"><tr>');
    h.push('<td class="l">' + esc(meta.client || '') + '</td>');
    h.push('<td class="c"><div class="t1">' + esc(meta.project || '') + '</div>' +
           '<div class="t2">TÍNH TOÁN CHIỀU DÀY THÀNH ỐNG</div></td>');
    h.push('<td class="r">' + esc(meta.company || '') + '</td>');
    h.push('</tr></table></div>');

    h.push('<table class="sh-meta"><tr>' +
      '<td><b>Hạng mục</b>: ' + esc(meta.item || '—') + '</td>' +
      '<td><b>Số tài liệu</b>: ' + esc(meta.docNo || '—') + '</td>' +
      '<td><b>Rev</b>: ' + esc(meta.rev || '0') + '</td>' +
      '<td><b>Ngày</b>: ' + esc(meta.date || '') + '</td>' +
      '</tr><tr>' +
      '<td><b>Người lập</b>: ' + esc(meta.by || '') + '</td>' +
      '<td><b>Kiểm tra</b>: ' + esc(meta.checked || '') + '</td>' +
      '<td><b>Phê duyệt</b>: ' + esc(meta.approved || '') + '</td>' +
      '<td><b>Lưu chất</b>: ' + esc(ctx.fluidName) + '</td>' +
      '</tr></table>');

    h.push('<div class="sh-h">1. CƠ SỞ TÍNH TOÁN</div>');
    h.push('<table class="sh-kv">' +
      '<tr><td class="k">Bộ tiêu chuẩn</td><td>: ' + esc(ctx.codeName) + '</td></tr>' +
      '<tr><td class="k">Vật liệu</td><td>: ' + esc(ctx.matName) + ' (' +
        esc(ctx.matKind) + ', ' + esc(ctx.matForm) + ')</td></tr>' +
      '</table>');
    h.push('<div class="sh-eq">' + esc(ctx.eq) +
      '<div class="ref">' + esc(ctx.ref) + '</div></div>');

    if (ctx.matBlocked) {
      h.push('<div class="sh-alert">CẢNH BÁO: vật liệu này KHÔNG dùng được ở nhiệt độ ' +
        'thiết kế ' + esc(ctx.T) + ' °C (mốc của vật liệu: ' + esc(ctx.matMinTemp) +
        ' °C).</div>');
    }

    h.push('<div class="sh-h">2. THÔNG SỐ ĐẦU VÀO</div>');
    h.push('<table class="sh-par">');
    h.push(paramRow('P', 'Áp suất thiết kế bên trong', ctx.P.toFixed(3), 'MPa'));
    h.push(paramRow('T', 'Nhiệt độ thiết kế', ctx.T.toFixed(1), '°C'));
    if (ctx.codeKey === 'b31_8') {
      h.push(paramRow('S', 'SMYS của vật liệu', ctx.SMYS.toFixed(1), 'MPa'));
      h.push(paramRow('F', 'Hệ số thiết kế theo Class Location', ctx.F.toFixed(2), ''));
      h.push(paramRow('T', 'Hệ số giảm nhiệt độ', ctx.Tf.toFixed(2), ''));
    } else {
      h.push(paramRow('S', 'Ứng suất cho phép của vật liệu ở nhiệt độ thiết kế',
        ctx.S.toFixed(2), 'MPa'));
      h.push('<tr><td></td><td class="dsc sub">nguồn: ' + esc(ctx.Ssource) +
        ' · ' + esc(ctx.Snote) + '</td><td></td><td></td></tr>');
      h.push(paramRow('Y', 'Hệ số vật liệu (ASME B31.3, Bảng 304.1.1)',
        ctx.Y.toFixed(3), ''));
    }
    h.push(paramRow('E', 'Hệ số chất lượng mối nối (Bảng A-1A / A-1B)',
      ctx.E.toFixed(2), ''));
    if (ctx.codeKey === 'b31_3') {
      h.push(paramRow('W', 'Hệ số giảm bền mối hàn (Bảng 302.3.5)', ctx.W.toFixed(2), ''));
    }
    h.push(paramRow('c', 'Dư ăn mòn, chiều sâu ren và rãnh', ctx.c.toFixed(2), 'mm'));
    h.push(paramRow('', 'Dung sai chế tạo ống', (ctx.tol * 100).toFixed(1), '%'));
    if (ctx.structMin > 0) {
      h.push(paramRow('', 'Chiều dày tối thiểu về kết cấu (yêu cầu dự án)',
        ctx.structMin.toFixed(2), 'mm'));
    }
    h.push(paramRow('D₀', 'Đường kính ngoài (ASME B36.10M / B36.19M)', 'xem bảng', 'mm'));
    h.push(paramRow('t', 'Chiều dày theo áp suất thiết kế', 'xem bảng', 'mm'));
    h.push(paramRow('tₘ', 'Chiều dày tối thiểu yêu cầu = t + c', 'xem bảng', 'mm'));
    h.push(paramRow('T′', 'Chiều dày còn lại sau khi trừ dung sai chế tạo',
      'xem bảng', 'mm'));
    h.push('</table>');

    h.push('<div class="sh-h">3. KẾT QUẢ</div>');
    h.push('<table class="sh-res"><thead><tr>' +
      '<th rowspan="2">Kích cỡ<br>(NPS)</th><th rowspan="2">D₀</th>' +
      '<th rowspan="2">t</th><th rowspan="2">tₘ=t+c</th>' +
      '<th rowspan="2">Đặt hàng<br>tối thiểu</th>' +
      '<th colspan="2">T<sub>nom</sub> đã chọn</th>' +
      '<th rowspan="2">T′</th><th rowspan="2">MAWP<br>[MPa]</th>' +
      '<th rowspan="2">Kết quả</th><th rowspan="2">Kiểm tra<br>(t&lt;D₀/6)</th>' +
      '</tr><tr><th>Chiều dày</th><th>Schedule</th></tr></thead><tbody>');
    for (const r of rows) {
      if (r.error) {
        h.push('<tr><td>' + esc(r.nps) + '</td><td colspan="10" class="no">LỖI: ' +
          esc(r.error) + '</td></tr>');
        continue;
      }
      const ch = r.chosen;
      h.push('<tr>' +
        '<td>' + esc(r.nps) + '</td>' +
        '<td>' + r.Do.toFixed(1) + '</td>' +
        '<td>' + r.t.toFixed(3) + '</td>' +
        '<td>' + r.tm.toFixed(2) + '</td>' +
        '<td>' + r.tOrder.toFixed(2) + '</td>' +
        '<td class="hi">' + (ch ? ch.Tnom.toFixed(2) : '—') + '</td>' +
        '<td class="hi">' + (ch ? esc(ch.sched) : '—') + '</td>' +
        '<td>' + (ch ? ch.Tprime.toFixed(3) : '—') + '</td>' +
        '<td>' + (ch ? ch.Pmax.toFixed(2) : '—') + '</td>' +
        '<td class="' + (ch ? 'ok' : 'no') + '">' + (ch ? 'Đạt' : 'Không đạt') + '</td>' +
        '<td class="' + (r.thick ? 'no' : '') + '">' + (r.thick ? 'NO' : 'YES') + '</td>' +
        '</tr>');
    }
    h.push('</tbody></table>');
    h.push('<div class="sh-note">Đơn vị: mm, trừ cột MAWP [MPa]. ' +
      '“Đặt hàng tối thiểu” = tₘ / (1 − dung sai) — chiều dày danh nghĩa nhỏ nhất ' +
      'phải mua để sau dung sai chế tạo vẫn còn đủ tₘ.</div>');

    if (warns && warns.length) {
      h.push('<div class="sh-h">4. CẢNH BÁO VÀ GHI CHÚ</div>');
      h.push('<ol class="sh-w">');
      for (const it of warns) {
        h.push('<li class="' + esc(it.w.lv) + '">' +
          (it.nps && it.nps.length ? '<i>(NPS ' + esc(it.nps.join(', ')) + ')</i> ' : '') +
          esc(it.w.text) +
          (it.w.basis ? ' <span class="bs">[' + esc(it.w.basis) + ']</span>' : '') +
          '</li>');
      }
      h.push('</ol>');
    }

    h.push('<div class="sh-h">5. GIỚI HẠN CỦA KẾT QUẢ</div>');
    h.push('<ul class="sh-lim">' +
      '<li>Chỉ tính chiều dày chịu áp suất bên trong. Chưa xét áp suất ngoài và chân ' +
      'không, tải trọng bền vững và tải thỉnh thoảng (§302.3, §304.1.1), ứng suất do ' +
      'giãn nở nhiệt, mỏi, và các bộ phận đặc biệt (rẽ nhánh, co, côn giảm, mặt bích).</li>' +
      '<li>Ứng suất cho phép S do người lập nhập từ ASME B31.3 Bảng A-1; công cụ không ' +
      'kèm sẵn bảng này và không tự kiểm tra được trị số đã nhập.</li>' +
      '<li>Bảng kích thước ống là dữ liệu tham khảo — phải đối chiếu ASME B36.10M / ' +
      'B36.19M bản hiện hành.</li>' +
      '<li>Việc chọn vật liệu theo lưu chất và nhiệt độ là bước sàng lọc; yêu cầu thử ' +
      'va đập và giới hạn NACE phải tra tiêu chuẩn gốc.</li>' +
      '</ul>');

    h.push('<div class="sh-foot"><span>' + esc(meta.docNo || '') + '</span>' +
      '<span>Rev ' + esc(meta.rev || '0') + '</span>' +
      '<span>' + esc(meta.date || '') + '</span></div>');

    return h.join('');
  }

  root.PTW = root.PTW || {};
  root.PTW.sheet = { build };
})(typeof globalThis !== 'undefined' ? globalThis : this);
