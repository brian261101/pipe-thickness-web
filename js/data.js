/* Dữ liệu tra cứu: kích thước ống, lưu chất, tiêu chuẩn.

   CẢNH BÁO: bảng kích thước dưới đây là DỮ LIỆU THAM KHẢO để điền nhanh.
   Phải đối chiếu ASME B36.10M (thép carbon) / B36.19M (thép không gỉ) bản
   hiện hành trước khi phát hành. Mọi chiều dày trong bảng kết quả đều sửa
   tay được.

   Ứng suất cho phép S KHÔNG có sẵn trong công cụ này — xem js/materials.js
   để biết lý do. */
(function (root) {
  'use strict';

  const DISCLAIMER =
    'Bảng kích thước chỉ để điền nhanh — phải đối chiếu ASME B36.10M / B36.19M ' +
    'bản hiện hành. Ứng suất cho phép S phải lấy từ ASME B31.3 Bảng A-1 tại ' +
    'nhiệt độ thiết kế.';

  /* Đường kính ngoài [mm] — chung cho B36.10M và B36.19M */
  const OD = {
    '1/2': 21.3, '3/4': 26.7, '1': 33.4, '1-1/4': 42.2, '1-1/2': 48.3,
    '2': 60.3, '2-1/2': 73.0, '3': 88.9, '3-1/2': 101.6, '4': 114.3,
    '5': 141.3, '6': 168.3, '8': 219.1, '10': 273.0, '12': 323.8,
    '14': 355.6, '16': 406.4, '18': 457.2, '20': 508.0, '24': 609.6
  };

  const DN = {
    '1/2': 15, '3/4': 20, '1': 25, '1-1/4': 32, '1-1/2': 40, '2': 50,
    '2-1/2': 65, '3': 80, '3-1/2': 90, '4': 100, '5': 125, '6': 150,
    '8': 200, '10': 250, '12': 300, '14': 350, '16': 400, '18': 450,
    '20': 500, '24': 600
  };

  /* Chiều dày thành [mm].
     Nhóm "S" theo B36.19M (thép không gỉ), còn lại theo B36.10M. */
  const WALL = {
    //         5S     10S    40S/STD/40        80S/XS/80      160     XXS
    '1/2':   { '5S': 1.65, '10S': 2.11, 'STD/40': 2.77,  'XS/80': 3.73,  '160': 4.78,  'XXS': 7.47 },
    '3/4':   { '5S': 1.65, '10S': 2.11, 'STD/40': 2.87,  'XS/80': 3.91,  '160': 5.56,  'XXS': 7.82 },
    '1':     { '5S': 1.65, '10S': 2.77, 'STD/40': 3.38,  'XS/80': 4.55,  '160': 6.35,  'XXS': 9.09 },
    '1-1/4': { '5S': 1.65, '10S': 2.77, 'STD/40': 3.56,  'XS/80': 4.85,  '160': 6.35,  'XXS': 9.70 },
    '1-1/2': { '5S': 1.65, '10S': 2.77, 'STD/40': 3.68,  'XS/80': 5.08,  '160': 7.14,  'XXS': 10.15 },
    '2':     { '5S': 1.65, '10S': 2.77, 'STD/40': 3.91,  'XS/80': 5.54,  '160': 8.74,  'XXS': 11.07 },
    '2-1/2': { '5S': 2.11, '10S': 3.05, 'STD/40': 5.16,  'XS/80': 7.01,  '160': 9.53,  'XXS': 14.02 },
    '3':     { '5S': 2.11, '10S': 3.05, 'STD/40': 5.49,  'XS/80': 7.62,  '160': 11.13, 'XXS': 15.24 },
    '3-1/2': { '5S': 2.11, '10S': 3.05, 'STD/40': 5.74,  'XS/80': 8.08 },
    '4':     { '5S': 2.11, '10S': 3.05, 'STD/40': 6.02,  'XS/80': 8.56,  '160': 13.49, 'XXS': 17.12 },
    '5':     { '5S': 2.77, '10S': 3.40, 'STD/40': 6.55,  'XS/80': 9.53,  '160': 15.88, 'XXS': 19.05 },
    '6':     { '5S': 2.77, '10S': 3.40, 'STD/40': 7.11,  'XS/80': 10.97, '160': 18.26, 'XXS': 21.95 },
    '8':     { '5S': 2.77, '10S': 3.76, 'STD/40': 8.18,  'XS/80': 12.70, '160': 23.01, 'XXS': 22.23 },
    '10':    { '5S': 3.40, '10S': 4.19, 'STD/40': 9.27,  'XS': 12.70, '80': 15.09, '160': 28.58, 'XXS': 25.40 },
    '12':    { '5S': 3.96, '10S': 4.57, 'STD': 9.53, '40': 10.31, 'XS': 12.70, '80': 17.48, '160': 33.32, 'XXS': 25.40 },
    '14':    { '10S': 4.78, 'STD': 9.53, '40': 11.13, 'XS': 12.70, '80': 19.05, '160': 35.71 },
    '16':    { '10S': 4.78, 'STD': 9.53, '40': 12.70, 'XS': 12.70, '80': 21.44, '160': 40.49 },
    '18':    { '10S': 4.78, 'STD': 9.53, '40': 14.27, 'XS': 12.70, '80': 23.83, '160': 45.24 },
    '20':    { '10S': 5.54, 'STD': 9.53, '40': 15.09, 'XS': 12.70, '80': 26.19, '160': 50.01 },
    '24':    { '10S': 6.35, 'STD': 9.53, '40': 17.48, 'XS': 12.70, '80': 30.96, '160': 59.54 }
  };

  /* Thứ tự tăng dần để chọn schedule nhẹ nhất còn đạt */
  const SCHED_ORDER = ['5S', '10S', 'STD', 'STD/40', '40', 'XS', 'XS/80', '80',
                       '160', 'XXS'];

  function schedulesFor(nps) {
    const av = WALL[nps] || {};
    return SCHED_ORDER.filter(s => av[s] !== undefined);
  }
  function wallOf(nps, sched) {
    return (WALL[nps] || {})[sched];
  }
  /* Object.keys() tra ve cac key dang so nguyen TRUOC, theo thu tu so, roi moi
     den cac key chuoi. Voi bang nay no cho ra '1','2',...,'24','1/2','3/4',...
     — sai hoan toan thu tu kich co. Phai liet ke tuong minh. */
  const NPS_LIST = ['1/2', '3/4', '1', '1-1/4', '1-1/2', '2', '2-1/2', '3',
                    '3-1/2', '4', '5', '6', '8', '10', '12', '14', '16', '18',
                    '20', '24'];

  /* Dung sai chế tạo — quyết định T' = Tnom × (1 − tol) */
  const MILL_TOLERANCE = {
    'Ống đúc (SMLS) — 12,5%': 0.125,
    'Ống hàn (welded) — 12,5%': 0.125,
    'Ống hàn, dung sai theo bảng — 0%': 0.0,
    'Tự nhập': null
  };

  /* Bộ tiêu chuẩn tính chiều dày */
  const CODES = {
    'ASME B31.3 — Process Piping': {
      key: 'b31_3',
      eq: 't = P·D / (2·(S·E·W + P·Y))',
      ref: '§304.1.2 (a), pt (3a); t_m = t + c theo §304.1.1 (a)',
      note: 'Bộ tiêu chuẩn phổ biến nhất cho đường ống công nghệ, nhà máy LNG.'
    },
    'ASME B31.1 — Power Piping': {
      key: 'b31_1',
      eq: 't_m = P·D / (2·(S·E + P·y)) + A',
      ref: '§104.1.2, pt (3)',
      note: 'Đường ống hơi, nhà máy điện. Hệ số y tương đương Y của B31.3.'
    },
    'ASME B31.8 — Gas Transmission': {
      key: 'b31_8',
      eq: 't = P·D / (2·S·F·E·T)',
      ref: '§841.1.1',
      note: 'Tuyến ống dẫn khí. S = SMYS, F = hệ số thiết kế theo Class Location, ' +
            'T = hệ số giảm nhiệt độ.'
    }
  };

  /* Hệ số thiết kế F theo Class Location — ASME B31.8 Bảng 841.1.6-1 */
  const B31_8_F = {
    'Class 1, Division 1 — F = 0,80': 0.80,
    'Class 1, Division 2 — F = 0,72': 0.72,
    'Class 2 — F = 0,60': 0.60,
    'Class 3 — F = 0,50': 0.50,
    'Class 4 — F = 0,40': 0.40
  };

  /* Lưu chất — dùng để sàng lọc vật liệu */
  const FLUIDS = {
    'LNG (lỏng, −162 °C)': {
      key: 'lng', cryo: true, typicalT: -162,
      note: 'Cryogenic. Vật liệu phải qua được nhiệt độ thiết kế mà không cần ' +
            'hoặc đã có thử va đập.'
    },
    'NG / khí thiên nhiên khô': {
      key: 'ng', cryo: false, typicalT: 50,
      note: 'Khí khô, không ăn mòn. Thép carbon dùng tốt.'
    },
    'NG ẩm / có H₂S (sour)': {
      key: 'sour', cryo: false, typicalT: 50, sour: true,
      note: 'Phải tuân NACE MR0175 / ISO 15156: giới hạn độ cứng, cấm một số vật liệu.'
    },
    'Nước công nghệ / nước sạch': { key: 'water', cryo: false, typicalT: 40, note: '' },
    'Nước biển': {
      key: 'seawater', cryo: false, typicalT: 35, chloride: true,
      note: 'Clorua cao — thép không gỉ austenit thường bị rỗ và SCC.'
    },
    'Hơi nước / nước nóng': { key: 'steam', cryo: false, typicalT: 180, note: '' },
    'Khí nén / nitơ': { key: 'air', cryo: false, typicalT: 50, note: '' },
    'Dầu / hydrocarbon lỏng': { key: 'oil', cryo: false, typicalT: 60, note: '' },
    'Hoá chất — acid': {
      key: 'acid', cryo: false, typicalT: 40, corrosive: true,
      note: 'Phải chọn vật liệu theo đúng loại và nồng độ acid.'
    },
    'Hoá chất — kiềm': { key: 'caustic', cryo: false, typicalT: 40, corrosive: true, note: '' }
  };

  root.PTW = root.PTW || {};
  root.PTW.data = {
    DISCLAIMER, OD, DN, WALL, SCHED_ORDER, NPS_LIST,
    schedulesFor, wallOf, MILL_TOLERANCE, CODES, B31_8_F, FLUIDS
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
