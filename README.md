# Tính chiều dày thành ống &amp; chọn ống

Công cụ web tính **chiều dày thành ống chịu áp suất trong** theo **ASME B31.3 /
B31.1 / B31.8**, chọn schedule phù hợp cho cả dải kích cỡ, và **sàng lọc vật liệu
ống theo lưu chất và nhiệt độ thiết kế**. Xuất ra **tờ tính toán PDF** đúng dạng hồ sơ.

Chạy **hoàn toàn trong trình duyệt** — không cần cài gì, không máy chủ, không có dữ
liệu nào rời khỏi máy bạn.

**👉 Dùng ngay: https://brian261101.github.io/pipe-thickness-web/**

> ⚠️ Công cụ **sàng lọc và định cỡ sơ bộ**. Hồ sơ phát hành phải được kỹ sư có thẩm
> quyền kiểm tra độc lập. Xem mục *Giới hạn*.

---

## Quy trình

Công cụ **bắt buộc chọn bộ tiêu chuẩn thiết kế trước**, vì mỗi bộ dùng phương trình
và bộ hệ số khác nhau. Chưa chọn thì các bước sau bị khoá.

| Bước | Nội dung |
|---|---|
| **1** | Chọn bộ tiêu chuẩn — B31.3, B31.1 hoặc B31.8 |
| **2** | Điều kiện thiết kế: P, T, dư ăn mòn c, dung sai chế tạo |
| **3** | Hệ số: E, W, Y (Y tự điền 0,4 khi T ≤ 482 °C), hoặc F và T cho B31.8 |
| **4** | Dải kích cỡ và cách chọn schedule (tự chọn nhẹ nhất, hoặc ép một schedule) |
| **5** | Lưu chất và vật liệu → xem bảng sàng lọc vật liệu |
| **6** | TÍNH → bảng kết quả, cảnh báo, báo cáo, và **Xuất PDF** |

---

## Phương trình

### ASME B31.3 §304.1.2 (a), pt (3a)
```
t  = P·D₀ / (2·(S·E·W + P·Y))
tₘ = t + c                                    §304.1.1 (a)
Đặt hàng tối thiểu ≥ tₘ / (1 − dung sai)
Đạt khi  T_nom·(1 − dung sai) ≥ tₘ
```

Khi **t ≥ D₀/6** thì pt (3a) không còn áp dụng. Công cụ tự phát hiện, giải lặp với
`Y = (d + 2c)/(D₀ + d + 2c)` theo ghi chú Bảng 304.1.1, và **cảnh báo** rằng
§304.1.2 (b) còn đòi hỏi xét lý thuyết phá huỷ, mỏi và ứng suất nhiệt.

### Áp suất lớn nhất cho phép
Đảo ngược chính phương trình trên với chiều dày còn lại sau dung sai và ăn mòn:
```
MAWP = 2·S·E·W·t_avail / (D₀ − 2·Y·t_avail),   t_avail = T_nom(1−tol) − c
```

### ASME B31.1 §104.1.2 · ASME B31.8 §841.1.1
```
B31.1:  tₘ = P·D / (2·(S·E + P·y)) + A
B31.8:  t  = P·D / (2·S·F·E·T)       S = SMYS, F theo Class Location
```

---

## Vì sao công cụ **không** kèm sẵn Bảng A-1

Ứng suất cho phép **S** quyết định trực tiếp chiều dày. Nhập sai S thì ra ống mỏng
hơn mức an toàn, và **không phép kiểm tra nào phía sau phát hiện được**. Bảng A-1 lại
là bảng tra có bản quyền, thay đổi theo từng lần tái bản, và phụ thuộc cả mác — dạng
sản phẩm — nhiệt độ.

Nên S là số **bạn nhập**, kèm ghi chú nguồn, lưu trong trình duyệt. Mỗi vật liệu có
một danh sách điểm `nhiệt độ : S` và công cụ **nội suy tuyến tính** giữa các điểm.
Thiếu S thì **từ chối tính** chứ không lặng lẽ ra số.

Làm một lần rồi bấm **Xuất thư viện** ra JSON để cả công ty dùng chung — đó là cách
đúng: một thư viện đã được kiểm tra, dùng lại cho mọi dự án.

---

## Chọn vật liệu theo lưu chất và nhiệt độ

Bảng sàng lọc xếp hạng vật liệu theo mức phù hợp ở nhiệt độ thiết kế hiện tại, mỗi
cảnh báo có ghi cơ sở:

- **Nhiệt độ thấp** — so nhiệt độ thiết kế với mốc của vật liệu (thép carbon −29 °C,
  A333 Gr.6 −45 °C, Gr.3 −101 °C, 9 % Ni −196 °C, austenit −198 °C). Yêu cầu thử va
  đập tra ASME B31.3 §323.2.2 và Hình 323.2.2A.
- **Sour service** — H₂S: giới hạn độ cứng và vật liệu theo NACE MR0175 / ISO 15156.
- **Clorua** — nước biển với inox austenit: rỗ và nứt do ăn mòn ứng suất; công cụ
  đánh dấu **không phù hợp** và gợi ý duplex / hợp kim Ni.
- **CSCC dưới lớp bảo ôn** — austenit trên ~60 °C có clorua.

Kết luận tổng thể tính **cả hai phía**: chiều dày đủ mà vật liệu không dùng được ở
nhiệt độ thiết kế thì vẫn báo **KHÔNG ĐẠT**.

---

## Xuất PDF

Nút **Xuất PDF** dựng một tờ tính toán A4 rồi gọi hộp thoại in của trình duyệt —
chọn *Lưu thành PDF*. Không nhúng thư viện PDF nào, nên chữ trong file **chọn và tìm
được**, tiếng Việt hiển thị đúng.

Tờ in gồm: khung tên (công trình, hạng mục, số tài liệu, rev, người lập / kiểm tra /
phê duyệt, ngày) → cơ sở tính toán và phương trình → khối tham số dạng
`ký hiệu : diễn giải : trị số : đơn vị` → bảng kết quả → cảnh báo → giới hạn của kết
quả → chân trang lặp lại mỗi trang.

*Muốn có số trang: bật “Headers and footers” trong hộp thoại in của trình duyệt.*

---

## Tự kiểm chứng

Nút **Tự kiểm chứng** chạy ngay trong trình duyệt **40 phép kiểm tra**:

- 33 phép so `t`, `tₘ`, `T′` của 11 kích cỡ với kết quả tính tay theo pt (3a)
- MAWP phải **đảo ngược đúng** phương trình (đặt chiều dày vừa khít tₘ thì MAWP phải
  bằng đúng P thiết kế)
- Chiều dày đặt hàng tối thiểu khớp với `tₘ/(1−tol)`
- Nhánh **thành dày** `t ≥ D₀/6` được phát hiện và nghiệm lặp tự nhất quán
- Nội suy S theo nhiệt độ
- Thiếu S thì **báo lỗi**, không tính bừa

Bài toán mẫu dùng P = 1,0 MPa · S = 138 MPa · E = W = 1,0 · Y = 0,4 · c = 2,0 mm ·
dung sai 12,5 % — bộ thông số điển hình của hệ cấp khí LNG áp suất thấp.

---

## Dùng offline

```bash
git clone https://github.com/brian261101/pipe-thickness-web.git
```

rồi mở `index.html` bằng trình duyệt, kể cả khi không có mạng. Các file JS nạp bằng
thẻ `<script>` thường (không phải ES module) chính là để mở trực tiếp từ `file://`
cũng chạy.

---

## Cấu trúc

```
index.html
css/app.css        giao diện + toàn bộ khối @media print của tờ PDF
js/data.js         kích thước ống, lưu chất, bộ tiêu chuẩn, dung sai
js/materials.js    thư viện S(T), giới hạn nhiệt độ, quy tắc sàng lọc
js/calc.js         B31.3 / B31.1 / B31.8, nhánh thành dày, MAWP
js/select.js       chạy cả dải NPS, chọn schedule nhẹ nhất còn đạt
js/verify.js       bộ tự kiểm chứng
js/report.js       báo cáo văn bản
js/sheet.js        dựng tờ tính toán để in PDF
js/app.js          giao diện
```

Không framework, không bước build, không phụ thuộc gói nào.

---

## Giới hạn

Chỉ tính chiều dày chịu **áp suất bên trong**. **Chưa xét**: áp suất ngoài và chân
không; tải trọng bền vững và tải thỉnh thoảng (§302.3, §304.1.1); ứng suất do giãn nở
nhiệt; mỏi và rung; các bộ phận đặc biệt (chỗ rẽ nhánh, co, côn giảm, mặt bích); và
việc kiểm tra cấp áp suất của mặt bích theo B16.5 ở nhiệt độ thiết kế.

Bảng kích thước ống là dữ liệu tham khảo — phải đối chiếu ASME B36.10M / B36.19M bản
hiện hành. Ứng suất cho phép do người dùng nhập; công cụ không kiểm tra được trị số
đó có đúng mác, dạng sản phẩm và nhiệt độ hay không.

Việc chọn vật liệu theo lưu chất là bước **sàng lọc**, không thay thế việc tra tiêu
chuẩn và spec dự án.

---

## Liên quan

- [pipe-support-web](https://github.com/brian261101/pipe-support-web) — tính giá đỡ
  đường ống bằng phần tử hữu hạn, cũng chạy trong trình duyệt
- [pipe-support-tool](https://github.com/brian261101/pipe-support-tool) — bản Windows
  của công cụ giá đỡ, kèm `.exe`
