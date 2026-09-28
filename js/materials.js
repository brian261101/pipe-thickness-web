/* Thư viện vật liệu: ứng suất cho phép S(T), giới hạn nhiệt độ, sàng lọc theo lưu chất.

   ─────────────────────────────────────────────────────────────────────────
   VÌ SAO CÔNG CỤ NÀY KHÔNG KÈM SẴN BẢNG A-1
   ─────────────────────────────────────────────────────────────────────────
   Ứng suất cho phép S là con số quyết định trực tiếp chiều dày. Nhập sai S
   thì ra ống mỏng hơn mức an toàn, và sai đó không lộ ra ở bất kỳ phép kiểm
   tra nào phía sau. ASME B31.3 Bảng A-1 là bảng tra có bản quyền, thay đổi
   theo từng lần tái bản, và phụ thuộc cả mác — độ dày — dạng sản phẩm.

   Vì vậy công cụ KHÔNG chép sẵn bảng đó. S là số BẠN nhập, kèm ghi chú
   nguồn, và tự lưu lại trong trình duyệt. Làm một lần cho cả công ty rồi
   xuất ra JSON dùng chung là cách đúng.

   Hai giá trị được điền sẵn lấy từ một hồ sơ tính toán đã được kiểm tra và
   phê duyệt, vẫn cần đối chiếu lại với bản Bảng A-1 mà dự án của bạn áp dụng.

   Giới hạn nhiệt độ thấp nhất bên dưới là các mốc vật liệu phổ biến, dùng để
   SÀNG LỌC. Việc miễn hay bắt buộc thử va đập phải tra ASME B31.3 §323.2.2
   và Hình 323.2.2A cho từng trường hợp cụ thể.
*/
(function (root) {
  'use strict';

  const SRC_DOC = 'từ hồ sơ tính toán đã duyệt — cần đối chiếu B31.3 Bảng A-1';
  const SRC_NONE = 'CHƯA NHẬP — phải lấy từ B31.3 Bảng A-1 ở nhiệt độ thiết kế';

  /* group: 'ferritic' | 'austenitic' | 'other'  → dùng cho hệ số Y
     S: danh sách [nhiệt độ °C, S MPa], nội suy tuyến tính giữa các điểm  */
  const SEED = [
    {
      id: 'a106b', name: 'ASTM A106 Gr.B', kind: 'Thép carbon', group: 'ferritic',
      form: 'SMLS', E: 1.0, minTemp: -29,
      minTempNote: 'Thép carbon: dưới −29 °C phải thử va đập theo §323.2.2 / Hình 323.2.2A.',
      S: [[38, 138.0]], source: SRC_DOC
    },
    {
      id: 'a312_304', name: 'ASTM A312 TP304', kind: 'Inox austenit', group: 'austenitic',
      form: 'SMLS', E: 1.0, minTemp: -198,
      minTempNote: 'Austenit: thường được miễn thử va đập đến −198 °C nếu thoả điều kiện §323.2.2.',
      S: [[38, 138.0]], source: SRC_DOC
    },
    {
      id: 'a312_304l', name: 'ASTM A312 TP304L', kind: 'Inox austenit', group: 'austenitic',
      form: 'SMLS', E: 1.0, minTemp: -198,
      minTempNote: 'Austenit: xem §323.2.2.',
      S: [], source: SRC_NONE,
      warn: 'S của 304L THẤP HƠN 304. Nếu vật liệu ghi kép "304/304L" thì chỉ được ' +
            'dùng trị số của 304 khi chứng chỉ vật liệu (MTR) chứng minh đạt mác 304.'
    },
    {
      id: 'a312_316', name: 'ASTM A312 TP316', kind: 'Inox austenit', group: 'austenitic',
      form: 'SMLS', E: 1.0, minTemp: -198, minTempNote: 'Austenit: xem §323.2.2.',
      S: [], source: SRC_NONE
    },
    {
      id: 'a312_316l', name: 'ASTM A312 TP316L', kind: 'Inox austenit', group: 'austenitic',
      form: 'SMLS', E: 1.0, minTemp: -198, minTempNote: 'Austenit: xem §323.2.2.',
      S: [], source: SRC_NONE,
      warn: 'S của 316L thấp hơn 316 — xem ghi chú ở 304L.'
    },
    {
      id: 'a333_6', name: 'ASTM A333 Gr.6', kind: 'Thép nhiệt độ thấp', group: 'ferritic',
      form: 'SMLS', E: 1.0, minTemp: -45,
      minTempNote: 'Thép chịu lạnh, mốc thường dùng −45 °C.',
      S: [], source: SRC_NONE
    },
    {
      id: 'a333_3', name: 'ASTM A333 Gr.3 (3,5 % Ni)', kind: 'Thép nhiệt độ thấp',
      group: 'ferritic', form: 'SMLS', E: 1.0, minTemp: -101,
      minTempNote: 'Mốc thường dùng −101 °C.', S: [], source: SRC_NONE
    },
    {
      id: 'a333_8', name: 'ASTM A333 Gr.8 (9 % Ni)', kind: 'Thép nhiệt độ thấp',
      group: 'ferritic', form: 'SMLS', E: 1.0, minTemp: -196,
      minTempNote: '9 % Ni — vật liệu kinh điển cho LNG, mốc −196 °C.',
      S: [], source: SRC_NONE
    },
    {
      id: 'a53b', name: 'ASTM A53 Gr.B', kind: 'Thép carbon', group: 'ferritic',
      form: 'ERW', E: 0.85, minTemp: -29,
      minTempNote: 'Như A106 Gr.B. E = 0,85 cho ống hàn điện trở — xem Bảng A-1B.',
      S: [], source: SRC_NONE
    },
    {
      id: 'api5l_x52', name: 'API 5L X52', kind: 'Ống tuyến (line pipe)', group: 'ferritic',
      form: 'SMLS/ERW', E: 1.0, minTemp: -29,
      minTempNote: 'Dùng với B31.8; S là SMYS = 359 MPa khi tính theo B31.8.',
      S: [], SMYS: 359, source: SRC_NONE
    },
    {
      id: 'api5l_x60', name: 'API 5L X60', kind: 'Ống tuyến (line pipe)', group: 'ferritic',
      form: 'SMLS/ERW', E: 1.0, minTemp: -29,
      minTempNote: 'SMYS = 414 MPa.', S: [], SMYS: 414, source: SRC_NONE
    }
  ];

  /* ---------- nội suy S theo nhiệt độ ---------- */
  function allowableStress(mat, T) {
    const pts = (mat.S || []).slice().sort((a, b) => a[0] - b[0]);
    if (!pts.length) return { S: null, note: 'chưa nhập S cho vật liệu này' };
    if (pts.length === 1) {
      return { S: pts[0][1],
               note: T > pts[0][0]
                 ? ('chỉ có một điểm ở ' + pts[0][0] + ' °C; nhiệt độ thiết kế ' + T +
                    ' °C CAO HƠN — phải nhập S tại nhiệt độ thiết kế')
                 : ('dùng trị số tại ' + pts[0][0] + ' °C') };
    }
    if (T <= pts[0][0]) {
      return { S: pts[0][1], note: 'dưới điểm thấp nhất trong bảng, lấy trị số tại ' +
        pts[0][0] + ' °C' };
    }
    if (T >= pts[pts.length - 1][0]) {
      return { S: pts[pts.length - 1][1],
        note: 'VƯỢT điểm cao nhất trong bảng (' + pts[pts.length - 1][0] +
              ' °C) — phải nhập thêm điểm ở nhiệt độ thiết kế' };
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [t0, s0] = pts[i], [t1, s1] = pts[i + 1];
      if (T >= t0 && T <= t1) {
        const S = s0 + (s1 - s0) * (T - t0) / (t1 - t0);
        return { S: S, note: 'nội suy tuyến tính giữa ' + t0 + ' và ' + t1 + ' °C' };
      }
    }
    return { S: null, note: 'không nội suy được' };
  }

  /* ---------- hệ số Y — ASME B31.3 Bảng 304.1.1 ----------
     Ở T ≤ 482 °C, Y = 0,4 cho cả thép ferrit và austenit. Trên mức đó Y thay
     đổi theo nhóm vật liệu và phải tra bảng, nên công cụ yêu cầu nhập tay. */
  function coefficientY(group, T) {
    if (T <= 482) return { Y: 0.4, auto: true, note: 'B31.3 Bảng 304.1.1, T ≤ 482 °C' };
    return { Y: null, auto: false,
             note: 'T > 482 °C — phải tra Y trong Bảng 304.1.1 và nhập tay' };
  }

  /* Y cho trường hợp thành dày t ≥ D/6 — ghi chú của Bảng 304.1.1 */
  function coefficientYThick(D, d, c) {
    return (d + 2 * c) / (D + d + 2 * c);
  }

  /* ---------- sàng lọc vật liệu theo lưu chất và nhiệt độ ---------- */
  function screen(mat, fluid, T) {
    const issues = [];
    let ok = true;

    if (mat.minTemp !== undefined && T < mat.minTemp) {
      ok = false;
      issues.push({ lv: 'bad',
        text: 'Nhiệt độ thiết kế ' + T + ' °C thấp hơn mốc ' + mat.minTemp +
              ' °C của vật liệu. ' + (mat.minTempNote || ''),
        basis: 'ASME B31.3 §323.2.2, Hình 323.2.2A' });
    } else if (mat.minTemp !== undefined && T < mat.minTemp + 15) {
      issues.push({ lv: 'warn',
        text: 'Nhiệt độ thiết kế ' + T + ' °C sát mốc ' + mat.minTemp +
              ' °C — cần xác nhận yêu cầu thử va đập.',
        basis: 'ASME B31.3 §323.2.2' });
    }

    if (fluid.sour && mat.group === 'ferritic') {
      issues.push({ lv: 'warn',
        text: 'Môi trường có H₂S: phải giới hạn độ cứng và chọn vật liệu theo ' +
              'NACE MR0175 / ISO 15156. Thép cường độ cao dễ bị nứt do hydro.',
        basis: 'NACE MR0175 / ISO 15156' });
    }
    if (fluid.sour && mat.group === 'austenitic') {
      issues.push({ lv: 'warn',
        text: 'Inox austenit trong môi trường sour vẫn có rủi ro SSC/SCC — ' +
              'phải kiểm tra theo MR0175 Phần 3.',
        basis: 'NACE MR0175 / ISO 15156' });
    }
    if (fluid.chloride && mat.group === 'austenitic') {
      issues.push({ lv: 'bad',
        text: 'Clorua cao + inox austenit (304/316) = rỗ và nứt do ăn mòn ứng suất. ' +
              'Cân nhắc duplex, super duplex hoặc hợp kim Ni.',
        basis: 'Thực hành ngành; xem ISO 21457' });
      ok = false;
    }
    if (fluid.chloride && mat.group === 'ferritic') {
      issues.push({ lv: 'warn',
        text: 'Nước biển ăn mòn thép carbon rất nhanh — cần lớp phủ, bảo vệ ' +
              'catốt hoặc dư ăn mòn lớn.', basis: '' });
    }
    if (mat.group === 'austenitic' && T > 60 && fluid.key === 'water') {
      issues.push({ lv: 'warn',
        text: 'Inox austenit trên ~60 °C có nước chứa clorua: rủi ro nứt do ăn mòn ' +
              'ứng suất (CSCC), kể cả hàm lượng clorua thấp dưới lớp bảo ôn.',
        basis: 'Thực hành ngành' });
    }
    if (fluid.cryo && mat.group === 'ferritic' && mat.minTemp > -100) {
      issues.push({ lv: 'info',
        text: 'Với dịch vụ cryogenic, hướng lựa chọn thông thường là inox austenit, ' +
              'thép 9 % Ni hoặc nhôm.', basis: '' });
    }
    if (fluid.corrosive) {
      issues.push({ lv: 'warn',
        text: 'Lưu chất ăn mòn: phải chọn vật liệu theo đúng loại, nồng độ và ' +
              'nhiệt độ — bảng sàng lọc này không thay thế việc đó.', basis: '' });
    }
    return { ok, issues };
  }

  function bestFor(fluid, T, materials) {
    return materials
      .map(m => ({ mat: m, res: screen(m, fluid, T) }))
      .sort((a, b) => (b.res.ok - a.res.ok) ||
        (a.res.issues.length - b.res.issues.length));
  }

  root.PTW = root.PTW || {};
  root.PTW.materials = {
    SEED, SRC_DOC, SRC_NONE,
    allowableStress, coefficientY, coefficientYThick, screen, bestFor
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
