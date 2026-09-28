/* Tính chiều dày thành ống — ASME B31.3 / B31.1 / B31.8.

   ── ASME B31.3 §304.1.2 ──────────────────────────────────────────────────
     t  = P·D / (2·(S·E·W + P·Y))                        pt (3a), khi t < D/6
     tm = t + c                                          §304.1.1 (a)
     T_đặt_hàng ≥ tm / (1 − dung sai)
     Đạt khi  T_nom·(1 − dung sai) ≥ tm

   Khi t ≥ D/6 thì pt (3a) không còn áp dụng: theo ghi chú Bảng 304.1.1 phải
   dùng Y = (d + 2c)/(D + d + 2c), và §304.1.2 (b) yêu cầu xét thêm lý thuyết
   phá huỷ, mỏi, ứng suất nhiệt. Công cụ giải lặp với Y đó và CẢNH BÁO.

   ── Áp suất lớn nhất cho phép (MAWP) ─────────────────────────────────────
     Đảo pt (3a) với chiều dày còn lại sau ăn mòn và dung sai:
     P_max = 2·S·E·W·t_avail / (D − 2·Y·t_avail),  t_avail = T_nom(1−tol) − c

   ── ASME B31.1 §104.1.2 ──────────────────────────────────────────────────
     tm = P·D / (2·(S·E + P·y)) + A

   ── ASME B31.8 §841.1.1 ──────────────────────────────────────────────────
     t = P·D / (2·S·F·E·T)      S = SMYS, F theo Class Location
*/
(function (root) {
  'use strict';
  const M = root.PTW.materials;

  /* ---------------- B31.3 ---------------- */
  function b31_3(o) {
    // o: { P, D, S, E, W, Y, c, tol, Tnom, group, Tdesign, structMin }
    const { P, D, S, E, W, c, tol } = o;
    const warnings = [];

    if (!(S > 0)) throw new Error('Chưa có ứng suất cho phép S. Nhập S tại nhiệt độ ' +
      'thiết kế, lấy từ ASME B31.3 Bảng A-1.');
    if (!(P > 0)) throw new Error('Áp suất thiết kế phải lớn hơn 0.');
    if (!(D > 0)) throw new Error('Đường kính ngoài phải lớn hơn 0.');

    let Y = o.Y;
    let t = P * D / (2 * (S * E * W + P * Y));
    let thick = false;

    if (t >= D / 6) {
      thick = true;
      // lặp với Y = (d + 2c)/(D + d + 2c), d = D − 2t
      for (let i = 0; i < 60; i++) {
        const d = Math.max(D - 2 * t, 1e-9);
        const Yt = M.coefficientYThick(D, d, c);
        const tNew = P * D / (2 * (S * E * W + P * Yt));
        if (Math.abs(tNew - t) < 1e-9) { t = tNew; Y = Yt; break; }
        t = tNew; Y = Yt;
      }
      warnings.push({
        lv: 'bad',
        text: 't ≥ D/6 — phương trình (3a) không còn áp dụng trực tiếp. Công cụ đã ' +
              'giải lặp với Y = (d+2c)/(D+d+2c) theo ghi chú Bảng 304.1.1, nhưng ' +
              '§304.1.2 (b) còn yêu cầu xét lý thuyết phá huỷ, ảnh hưởng mỏi và ' +
              'ứng suất nhiệt. Trường hợp này phải tính riêng.',
        basis: 'ASME B31.3 §304.1.2 (b), ghi chú Bảng 304.1.1'
      });
    }

    const tm = t + c;
    const tOrder = tol < 1 ? tm / (1 - tol) : Infinity;

    const out = { t, tm, Y, thick, tOrder, warnings, code: 'ASME B31.3' };

    if (o.Tnom > 0) {
      const Tp = o.Tnom * (1 - tol);
      const avail = Tp - c;
      out.Tnom = o.Tnom;
      out.Tprime = Tp;
      out.margin = Tp - tm;
      out.pass = Tp >= tm;
      out.ratio = tm > 0 ? Tp / tm : Infinity;
      out.Pmax = avail > 0
        ? 2 * S * E * W * avail / (D - 2 * Y * avail)
        : 0;
      if (avail <= 0) {
        warnings.push({ lv: 'bad',
          text: 'Sau khi trừ dung sai chế tạo và dư ăn mòn thì không còn chiều dày ' +
                'chịu áp nào.', basis: '' });
      }
    }

    if (o.structMin > 0 && o.Tnom > 0 && o.Tnom < o.structMin) {
      warnings.push({ lv: 'warn',
        text: 'Chiều dày danh nghĩa ' + o.Tnom.toFixed(2) + ' mm nhỏ hơn chiều dày ' +
              'tối thiểu về kết cấu/vận chuyển do dự án quy định (' +
              o.structMin.toFixed(2) + ' mm).', basis: 'Yêu cầu riêng của dự án' });
    }
    if (c > 0 && t > 0 && c / t > 3) {
      warnings.push({ lv: 'info',
        text: 'Dư ăn mòn ' + c.toFixed(1) + ' mm lớn gấp ' + (c / t).toFixed(0) +
              ' lần chiều dày chịu áp (' + t.toFixed(3) + ' mm) — chiều dày ống ' +
              'hoàn toàn do dư ăn mòn quyết định, không phải do áp suất. Nếu lưu ' +
              'chất không ăn mòn (khí khô, LNG) thì nên xem lại trị số này.',
        basis: 'ASME B31.3 §302.4' });
    }
    return out;
  }

  /* ---------------- B31.1 ---------------- */
  function b31_1(o) {
    const { P, D, S, E, c, tol } = o;
    const y = o.Y;
    if (!(S > 0)) throw new Error('Chưa có ứng suất cho phép S.');
    const tm = P * D / (2 * (S * E + P * y)) + c;
    const t = tm - c;
    const tOrder = tol < 1 ? tm / (1 - tol) : Infinity;
    const out = { t, tm, Y: y, thick: false, tOrder, warnings: [], code: 'ASME B31.1' };
    if (o.Tnom > 0) {
      const Tp = o.Tnom * (1 - tol);
      const avail = Tp - c;
      out.Tnom = o.Tnom; out.Tprime = Tp; out.margin = Tp - tm;
      out.pass = Tp >= tm; out.ratio = tm > 0 ? Tp / tm : Infinity;
      out.Pmax = avail > 0 ? 2 * S * E * avail / (D - 2 * y * avail) : 0;
    }
    return out;
  }

  /* ---------------- B31.8 ---------------- */
  function b31_8(o) {
    const { P, D, c, tol } = o;
    const SMYS = o.SMYS, F = o.F, E = o.E, Tf = o.Tf === undefined ? 1.0 : o.Tf;
    if (!(SMYS > 0)) throw new Error('Chưa có SMYS cho vật liệu (B31.8 dùng SMYS, ' +
      'không dùng S của Bảng A-1).');
    const t = P * D / (2 * SMYS * F * E * Tf);
    const tm = t + c;
    const tOrder = tol < 1 ? tm / (1 - tol) : Infinity;
    const out = { t, tm, Y: null, thick: false, tOrder, warnings: [], code: 'ASME B31.8' };
    if (o.Tnom > 0) {
      const Tp = o.Tnom * (1 - tol);
      const avail = Tp - c;
      out.Tnom = o.Tnom; out.Tprime = Tp; out.margin = Tp - tm;
      out.pass = Tp >= tm; out.ratio = tm > 0 ? Tp / tm : Infinity;
      out.Pmax = avail > 0 ? 2 * SMYS * F * E * Tf * avail / D : 0;
    }
    out.warnings.push({ lv: 'info',
      text: 'B31.8 dùng SMYS và hệ số thiết kế F theo Class Location, không dùng ' +
            'ứng suất cho phép của B31.3.', basis: 'ASME B31.8 §841.1.1' });
    return out;
  }

  const ENGINES = { b31_3, b31_1, b31_8 };

  function compute(codeKey, o) {
    const fn = ENGINES[codeKey];
    if (!fn) throw new Error('Không biết bộ tiêu chuẩn: ' + codeKey);
    return fn(o);
  }

  /* Áp suất thử thuỷ lực theo B31.3 §345.4.2: 1,5 × P × (S_test/S_design),
     tỉ số ứng suất lấy = 1 khi thử ở nhiệt độ thường với vật liệu không giảm bền. */
  function hydrotest(P, ratio) {
    return 1.5 * P * (ratio === undefined ? 1.0 : ratio);
  }

  root.PTW = root.PTW || {};
  root.PTW.calc = { compute, b31_3, b31_1, b31_8, hydrotest };
})(typeof globalThis !== 'undefined' ? globalThis : this);
