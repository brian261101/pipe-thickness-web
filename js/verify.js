/* Tự kiểm chứng: chạy lại một bài toán mẫu ASME B31.3 và so với kết quả
   tính tay, cộng thêm vài phép kiểm tra tính nhất quán của công thức.

   Bài toán mẫu: P = 1,0 MPa · S = 138 MPa · E = W = 1,0 · Y = 0,4 ·
                 c = 2,0 mm · dung sai 12,5 %
   Đây là bộ thông số điển hình của một hệ cấp khí LNG áp suất thấp. */
(function (root) {
  'use strict';
  const C = root.PTW.calc;
  const D = root.PTW.data;
  const M = root.PTW.materials;

  const BASE = { codeKey: 'b31_3', P: 1.0, S: 138.0, E: 1.0, W: 1.0, Y: 0.4,
                 c: 2.0, tol: 0.125, structMin: 0 };

  /* [NPS, t, tm, T'] tính tay theo pt (3a) */
  const REF = [
    ['1/2', 0.077, 2.08, 2.424], ['3/4', 0.096, 2.10, 2.511],
    ['1', 0.121, 2.12, 2.958], ['1-1/2', 0.174, 2.17, 3.220],
    ['2', 0.218, 2.22, 3.421], ['2-1/2', 0.264, 2.26, 4.515],
    ['3', 0.321, 2.32, 4.804], ['4', 0.413, 2.41, 5.268],
    ['6', 0.608, 2.61, 6.221], ['8', 0.792, 2.79, 7.158],
    ['10', 0.986, 2.99, 8.111]
  ];

  function runVerification() {
    const rows = [];
    const chk = (name, got, want, tol) => {
      tol = tol === undefined ? 1e-3 : tol;
      rows.push({ name, got, want, ok: Math.abs(got - want) <= tol });
    };

    for (const [nps, t, tm, Tp] of REF) {
      const Do = D.OD[nps];
      const Tnom = D.wallOf(nps, 'STD/40') || D.wallOf(nps, 'STD');
      const r = C.compute('b31_3', Object.assign({}, BASE, { D: Do, Tnom: Tnom }));
      chk('NPS ' + nps + ' — t [mm]', r.t, t, 6e-4);
      chk('NPS ' + nps + ' — tm = t + c [mm]', r.tm, tm, 6e-3);
      chk('NPS ' + nps + " — T' = Tnom(1−12,5%) [mm]", r.Tprime, Tp, 6e-4);
    }

    /* MAWP phải đảo ngược đúng phương trình: đặt Tnom sao cho vừa khít tm
       thì Pmax phải bằng đúng P thiết kế. */
    {
      const Do = D.OD['4'];
      const r0 = C.compute('b31_3', Object.assign({}, BASE, { D: Do, Tnom: 0 }));
      const Tfit = r0.tm / (1 - BASE.tol);        // đặt hàng vừa đủ
      const r = C.compute('b31_3', Object.assign({}, BASE, { D: Do, Tnom: Tfit }));
      chk('MAWP đảo ngược đúng phương trình [MPa]', r.Pmax, BASE.P, 1e-6);
      chk('Chiều dày đặt hàng tối thiểu khớp [mm]', r0.tOrder, Tfit, 1e-9);
    }

    /* Nhánh thành dày: t ≥ D/6 phải được phát hiện và giải lặp */
    {
      const r = C.compute('b31_3', Object.assign({}, BASE,
        { D: 100, P: 90, S: 138, c: 0, Tnom: 0 }));
      rows.push({ name: 'Phát hiện nhánh thành dày t ≥ D/6',
        got: r.thick ? 1 : 0, want: 1, ok: r.thick === true });
      // với Y lặp, t phải thoả lại chính phương trình
      const d = 100 - 2 * r.t;
      const Yt = M.coefficientYThick(100, d, 0);
      const back = 90 * 100 / (2 * (138 * 1 * 1 + 90 * Yt));
      chk('Nghiệm lặp thành dày tự nhất quán [mm]', r.t, back, 1e-6);
    }

    /* Nội suy S theo nhiệt độ */
    {
      const mat = { S: [[38, 138], [200, 120]] };
      chk('Nội suy S tại 119 °C [MPa]',
          M.allowableStress(mat, 119).S, 138 + (120 - 138) * (119 - 38) / (200 - 38), 1e-9);
      chk('S dưới điểm thấp nhất giữ nguyên [MPa]',
          M.allowableStress(mat, -162).S, 138, 1e-12);
    }

    /* Thiếu S phải báo lỗi chứ không âm thầm ra số */
    {
      let threw = false;
      try { C.compute('b31_3', Object.assign({}, BASE, { D: 100, S: 0, Tnom: 5 })); }
      catch (e) { threw = true; }
      rows.push({ name: 'Thiếu S thì báo lỗi, không tính bừa',
        got: threw ? 1 : 0, want: 1, ok: threw });
    }

    return rows;
  }

  root.PTW = root.PTW || {};
  root.PTW.verify = { runVerification, BASE, REF };
})(typeof globalThis !== 'undefined' ? globalThis : this);
