# 🏷️ TINY HOARDER'S KEY MARKET — Hệ thống đấu giá trực tuyến

> Bài tập lớn môn **Lập trình nâng cao (LTNC)**  
> Ứng dụng Desktop đấu giá theo thời gian thực, kiến trúc **Client–Server**, viết bằng **Java 25**

> **Client web:** thư mục [`web/`](web/) có hướng dẫn chạy giao diện trình duyệt và kết nối với auction server hiện có. Phạm vi hiện tại gồm danh sách phiên, lọc danh mục, đăng ký/đăng nhập và đặt giá; các màn hình seller, admin và ví vẫn có trong ứng dụng JavaFX.

---

## 👥 Thành viên nhóm

| Thành viên | MSSV |
|---|---|
| Nguyễn Đình Hải | 25020139 |
| Bùi Trần Bảo MinhBảo Minh | 25020259 |
| Đặng Nam Khánh | 25020213 |
| Nguyễn Ngọc Thanh | 25020391 |

---

## 📌 Mô tả dự án

Hệ thống đấu giá trực tuyến cho phép nhiều người dùng tham gia **đặt giá theo thời gian thực** thông qua kết nối Socket TCP.

**Các vai trò trong hệ thống:**

- **Bidder (Người đặt giá):** Xem danh sách phiên đấu giá, đặt giá thủ công hoặc tự động, quản lý ví, xem lịch sử giao dịch, yêu thích phiên đấu giá, báo cáo vi phạm.
- **Seller (Người bán):** Đăng sản phẩm, tạo phiên đấu giá, theo dõi các phiên đang diễn ra, xác nhận thanh toán.
- **Admin:** Quản lý người dùng (khóa/mở khóa), theo dõi toàn bộ phiên đấu giá, xem thống kê hệ thống, xử lý báo cáo vi phạm.

**Tính năng nổi bật:**
- Đặt giá theo thời gian thực với thông báo push tức thì
- **Auto-bid** — tự động đặt giá theo bước tăng và giới hạn tối đa
- **Anti-sniping** — tự động gia hạn phiên đấu giá khi có người đặt giá trong những phút cuối
- Quản lý ví nội bộ: nạp tiền, giữ tiền cọc, hoàn tiền, thanh toán
- Phân loại sản phẩm: Điện tử, Nghệ thuật, Xe cộ

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ | Java 25 |
| Giao diện | JavaFX 21.0.6, FXML, SceneBuilder |
| Giao tiếp mạng | Socket TCP (cổng `9999`) |
| Cơ sở dữ liệu | MySQL 8, JDBC |
| Connection Pool | HikariCP 5.1.0 |
| Serialization | Gson 2.10.1 |
| Build tool | Apache Maven |
| Kiểm thử | JUnit 5 |
| Logging | SLF4J |

---

## 📁 Cấu trúc thư mục

```
LTNC-BTL-Dau-gia/
│
├── auction-server/                  # Module Server
│   └── src/main/java/com/auction/server/
│       ├── model/                   # Entity: User, Item, Auction, Bidder, Seller...
│       ├── repository/              # DAO Interface + Implementation (MySQL)
│       ├── service/                 # Business Logic: BiddingEngine, AuctionManager...
│       ├── network/                 # ServerApp, ClientHandler (xử lý đa luồng)
│       ├── factory/                 # ItemFactory (tạo sản phẩm theo loại)
│       ├── exception/               # Custom exceptions
│       └── util/                    # ImageStorageUtil
│
├── auction-client/                  # Module Client (JavaFX Desktop App)
│   └── src/main/java/sample/
│       ├── model/                   # DTO: Auction, Item, User, BidTransaction...
│       ├── form/panels/             # Form đăng sản phẩm theo danh mục
│       ├── Main.java                # Entry point ứng dụng
│       ├── ServerConnection.java    # Singleton kết nối Socket tới Server
│       ├── LoginController.java     # Màn hình đăng nhập
│       ├── RegisterController.java  # Màn hình đăng ký
│       ├── HomeController.java      # Màn hình chính (danh sách phiên đấu giá)
│       ├── AuctionDetailController  # Chi tiết phiên đấu giá + đặt giá
│       ├── SellerDashboardController # Dashboard người bán
│       ├── AdminDashboardController  # Dashboard admin
│       └── WalletController.java    # Quản lý ví
│   └── src/main/resources/sample/
│       ├── login.fxml / register.fxml
│       ├── home_demo.fxml
│       ├── AuctionDetail.fxml
│       ├── seller_dashboard.fxml
│       ├── seller_create_auction.fxml
│       ├── admin_dashboard.fxml
│       └── wallet.fxml
│
├── sql/
│   ├── init.sql                     # Script tạo toàn bộ database
│   └── readme/                      # Hướng dẫn setup database
│
├── uploads/items/                   # Ảnh sản phẩm lưu trên server
├── uml-class-diagram.html           # Sơ đồ lớp UML
└── pom.xml                          # Maven parent POM
```

---

## ✅ Các chức năng đã hoàn thành

### 🔐 Quản lý tài khoản
- [x] Đăng ký tài khoản mới
- [x] Đăng nhập / Đăng xuất
- [x] Phân quyền: Admin, Seller, Bidder

### 🛒 Chức năng Người đặt giá (Bidder)
- [x] Xem danh sách phiên đấu giá
- [x] Xem chi tiết phiên đấu giá
- [x] Đặt giá thủ công
- [x] Đặt giá tự động (Auto-bid) với bước giá và giới hạn tối đa
- [x] Xem thông báo khi có người đặt giá mới
- [x] Thêm/bỏ phiên đấu giá vào danh sách yêu thích
- [x] Báo cáo vi phạm phiên đấu giá

### 💰 Quản lý ví
- [x] Nạp tiền vào ví
- [x] Thanh toán khi thắng đấu giá
- [x] Xem lịch sử giao dịch ví

### 🏪 Chức năng Người bán (Seller)
- [x] Đăng sản phẩm theo danh mục (Điện tử, Nghệ thuật, Xe cộ)
- [x] Tạo phiên đấu giá cho sản phẩm
- [x] Đặt giá khởi điểm, bước giá, thời gian kết thúc
- [x] Tải lên hình ảnh sản phẩm
- [x] Xem danh sách sản phẩm đã đăng
- [x] Theo dõi các phiên đấu giá đang diễn ra

### 🛡️ Chức năng Admin
- [x] Xem danh sách tất cả người dùng
- [x] Khóa / Mở khóa tài khoản người dùng
- [x] Xem thống kê hệ thống (tổng người dùng, phiên đấu giá, doanh thu...)
- [x] Theo dõi toàn bộ phiên đấu giá

### ⚙️ Hệ thống
- [x] Đấu giá thời gian thực (Socket TCP)
- [x] Cơ chế Anti-sniping (gia hạn tự động khi có đặt giá trong 5 phút cuối)
- [x] Cập nhật giá thời gian thực cho tất cả người tham gia (Observer Pattern)
- [x] Xử lý đa luồng (Thread Pool)
- [x] Kết nối cơ sở dữ liệu MySQL qua HikariCP

---
### 🚀 Các chức năng nâng cao

#### 🛡️ An toàn giao dịch & Bảo mật
- [x] **Cơ chế Ban/Kick** — Admin khóa tài khoản và server chủ động ngắt kết nối client (`FORCE_LOGOUT`)
- [x] **Phân quyền Role-Based Access Control** — kiểm tra vai trò (ADMIN/SELLER/BIDDER) tại server trước mỗi thao tác

#### ⚡ Tối ưu hiệu năng & Xử lý đa luồng
- [x] **Thread Pool (ExecutorService)** — giới hạn số luồng xử lý client đồng thời, tránh tạo luồng vô hạn
- [x] **HikariCP Connection Pool** — tái sử dụng kết nối database, giảm overhead
- [x] **Daemon Thread quản lý phiên** — tự động cập nhật trạng thái phiên đấu giá mà không chặn main thread

#### 🔄 Cơ chế đấu giá thông minh
- [x] **Anti-Sniping** — tự động gia hạn thêm **5 phút** mỗi khi có đặt giá trong **5 phút cuối**
- [x] **Auto-Bid PriorityQueue** — nhiều người cùng đặt auto-bid, hệ thống ưu tiên theo thời gian + mức giá cao nhất
- [x] **Auto-Payment** — phiên kết thúc tự động thanh toán.

#### 📡 Giao tiếp thời gian thực
- [x] **Push Notification Server → Client** — server chủ động gửi `BID_UPDATE`, `TIME_EXTENDED`, `NEW_AUCTION_NOTIFY` mà không cần client polling
- [x] **Đồng bộ trạng thái qua `synchronized`** — đảm bảo `AuctionManager` an toàn trong môi trường đa luồng
- [x] **Client lắng nghe riêng luồng** — `ClientListener` chạy trên daemon thread, không chặn UI

#### 📊 Thống kê & Giám sát (Admin)
- [x] **Dashboard thống kê** — tổng người dùng, phiên đấu giá, doanh thu, tỷ lệ hoàn thành
- [x] **Báo cáo vi phạm** — bidder gửi report, admin xem danh sách và xử lý
- [x] **Theo dõi toàn bộ hệ thống** — admin giám sát mọi phiên đấu giá đang diễn ra

#### 🏭 Design Patterns chuyên sâu
- [x] **Factory Pattern** — `ItemFactory` tạo đối tượng theo loại (Electronics/Art/Vehicle)
- [x] **Observer Pattern** — `ClientHandler` đăng ký nhận thông báo khi có bid mới
- [x] **Singleton Pattern** — `AuctionManager`, `ServerConnection`, `UserSession` đảm bảo một instance duy nhất
- [x] **DAO Pattern** — interface + implementation, dễ mở rộng, tách biệt business logic và data access

#### 💾 Lưu trữ & Xử lý file
- [x] **Lưu trữ ảnh server-side** — `ImageStorageUtil` lưu ảnh sản phẩm trong thư mục `uploads/items/`
- [x] **Lịch sử giao dịch đầy đủ** — `WalletTransactions`, `BidTransactions` ghi nhận mọi thao tác

#### 🖥️ Giao diện người dùng
- [x] **LineChart thời gian thực** — biểu đồ lịch sử đặt giá trong chi tiết phiên đấu giá
- [x] **Auto-fill thông tin sản phẩm** — form tạo phiên đấu giá tự động điền thông tin sản phẩm
- [x] **Thông báo Toast** — hiển thị thông báo khi có bid mới hoặc thắng/thua đấu giá

## 📄 Báo cáo & Demo

| Tài liệu | Mô tả | Link |
|---|---|---|
| Báo cáo BTL | File PDF báo cáo bài tập lớn | 🔗 [https://drive.google.com/file/d/1uAFb5HdTp_EnS7m3d8YOxpPQw882UxLc/view?usp=sharing]() |
| Video Demo | Video demo toàn bộ chức năng | 🔗 [ https://drive.google.com/file/d/1e06CSN3xsjq0QbapZVsTZN85lVq1aWP1/view?usp=sharing]() |


## ⚙️ Hướng dẫn cài đặt & chạy

### Yêu cầu hệ thống

- **JDK 25** trở lên
- **Apache Maven** 3.8+
- **MySQL 8.0** trở lên
- IDE: IntelliJ IDEA (khuyến nghị) hoặc Eclipse

---

### Bước 1 — Tải file thực thi

Vào thư mục Releases/ trong repository và tải 2 file JAR:
```properties
Releases/auction-server-1.0-SNAPSHOT.jar
```
```properties
Releases/auction-client-1.0-SNAPSHOT.jar
```
### Bước 2 — Chạy Server (khởi động trước)
Vào thư mục chứa 2 file
```properties
auction-server-1.0-SNAPSHOT.jar
```
```properties
auction-client-1.0-SNAPSHOT.jar 
```
Mở 1 Cmd chạy java -jar auction-server-1.0-SNAPSHOT.jar
### Bước 3 — Chạy Client (khởi động sau)
Tại thư mục đó mở 1 Cmd khác chạy
```properties
java -jar auction-client-1.0-SNAPSHOT.jar
```
hoặc nháy đúp chuột. 
(Nếu muốn chạy nhiều client làm tương tự)
## 🗄️ Sơ đồ cơ sở dữ liệu

Database `auction_system` gồm các bảng chính:

| Bảng | Mô tả |
|---|---|
| `users` | Thông tin người dùng (ADMIN / SELLER / BIDDER) |
| `Items` | Sản phẩm đấu giá |
| `Electronics_Items` | Thông tin bổ sung cho sản phẩm điện tử |
| `Art_Items` | Thông tin bổ sung cho sản phẩm nghệ thuật |
| `Vehicle_Items` | Thông tin bổ sung cho xe cộ |
| `Auctions` | Các phiên đấu giá |
| `BidTransactions` | Lịch sử đặt giá |
| `WalletTransactions` | Lịch sử giao dịch ví |
| `AutoBids` | Cấu hình đặt giá tự động |
| `Favorites` | Danh sách yêu thích |
| `Reports` | Báo cáo vi phạm |

---

## 🏗️ Kiến trúc & Design Patterns

- **Kiến trúc:** Client–Server (Socket TCP)
- **MVC Pattern:** Tách biệt Model, View (FXML), Controller
- **DAO Pattern:** Interface + Implementation cho tất cả truy vấn database
- **Observer Pattern:** Cập nhật giá thời gian thực tới tất cả client đang kết nối
- **Factory Pattern:** `ItemFactory` tạo sản phẩm theo loại (Electronics, Art, Vehicle)
- **Singleton Pattern:** `AuctionManager`, `ServerConnection`, `UserSession`
- **Thread Pool:** Mỗi client kết nối được xử lý bởi một luồng riêng biệt

---
