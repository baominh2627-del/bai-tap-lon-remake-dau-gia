# Auction web client

Giao diện trình duyệt cho dự án Tiny Hoarder's Key Market. Web server Node.js làm cầu nối HTTP tới giao thức TCP hiện có trên cổng `9999`; các thao tác đấu giá, kiểm tra số dư, auto-bid và anti-sniping vẫn do Java auction server xử lý.

## Chạy trên máy cá nhân

1. Cài MySQL 8 và khởi tạo cơ sở dữ liệu theo hướng dẫn trong [`../sql/readme/Cách setup database.md`](../sql/readme/Cách%20setup%20database.md). Kiểm tra thông tin kết nối trong `auction-server/src/main/resources/database.properties`.
2. Dùng JDK 25 để build và chạy auction server:

   ```powershell
   cd ..
   .\auction-client\mvnw.cmd -f pom.xml -pl auction-server -am package
   java -jar auction-server\target\auction-server-1.0-SNAPSHOT.jar
   ```

   Nếu đã cài Maven, có thể dùng `mvn -pl auction-server -am package`.

3. Mở terminal thứ hai trong thư mục `web` và chạy:

   ```powershell
   node server.js
   ```

4. Mở [http://localhost:8080](http://localhost:8080).

`WEB_PORT`, `AUCTION_HOST`, `AUCTION_PORT` có thể đặt qua biến môi trường. Mỗi trình duyệt có một kết nối TCP riêng để trạng thái đăng nhập vẫn được giữ giữa các yêu cầu HTTP.

## Tính năng web hiện có

- Danh sách và lọc phiên theo danh mục, giá hiện tại, lượt trả giá và thời gian còn lại.
- Đăng ký, đăng nhập, đăng xuất và đặt giá qua Java server.
- Làm mới danh sách tự động định kỳ; hình ảnh đã tải lên được phục vụ từ thư mục `uploads/items`.
- Giao diện co giãn cho màn hình desktop và điện thoại.

## Đưa giao diện lên GitHub Pages

Workflow `.github/workflows/pages.yml` tự deploy `index.html` ở thư mục gốc cùng các tài nguyên trong `web/` và ảnh khi có commit lên `main`. Trong repository GitHub, vào **Settings → Pages** và chọn **GitHub Actions** làm nguồn deploy. Website sẽ hiển thị tại `https://<owner>.github.io/<repository>/`.

GitHub Pages chỉ lưu trữ giao diện tĩnh. Để dữ liệu và đặt giá hoạt động trên website công khai, cần chạy `web/server.js` cùng auction server trên một máy chủ có thể truy cập qua HTTPS, cấu hình CORS và cookie cho phép origin GitHub Pages, rồi điền URL máy chủ đó vào `web/config.js` (`window.AUCTION_API_BASE`).

Client web hiện có các màn hình tiền sảnh, đăng nhập/đăng ký, chi tiết phiên, đấu giá thủ công/tự động, yêu thích, kênh người bán, quản trị và ví. Một số màn hình phân tích nâng cao của desktop (biểu đồ doanh thu và phân trang/lọc lịch sử giao dịch) chưa được chuyển đầy đủ.
