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

Client web này hiện bao gồm luồng bidder cơ bản. Các màn hình seller, quản trị, ví và biểu đồ lịch sử vẫn còn ở JavaFX desktop và cần được chuyển tiếp nếu cần đầy đủ toàn bộ chức năng trên web.
