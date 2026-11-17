# Quy tắc thêm nhạc / How to add music

Repo này chứa nhạc dùng chung cho nhiều extension/project. Mọi người (và mọi tài khoản
AI Studio) thêm bài theo đúng quy trình sau để không giẫm chân nhau.

## Thêm một bài mới
1. Đặt file mp3 GỐC (không sửa, không nén lại, không cắt) vào `docs/tracks/`.
   Tên file chỉ gồm chữ thường/số và `. _ -`, không dấu, không khoảng trắng.
2. Tạo `docs/meta/<id>.json` (tên file = id). Mẫu: xem một file bất kỳ trong `docs/meta/`.
   Các trường bắt buộc: id, title, artist, durationSec, file, license, licenseUrl,
   sourceUrl, modified. Tùy chọn: album, order, attribution.
3. KHÔNG sửa tay `docs/tracks.json` và `docs/LICENSES.md`: GitHub Action tự tạo ra chúng.

## Giấy phép được chấp nhận
`CC0-1.0`, `CC-BY-4.0`, `CC-BY-3.0`, `CC-BY-SA-3.0`, `CC-BY-SA-4.0`.
KHÔNG nhận NC (phi thương mại), ND (không dẫn xuất) hoặc giấy phép chưa xác minh.
Người thêm bài tự chịu trách nhiệm xác minh giấy phép trên trang nguồn.

## Không làm
- Không xóa, đổi tên hay sửa file của bài khác.
- Không chép giấy phép "theo trí nhớ": chỉ ghi đúng như trang nguồn.
