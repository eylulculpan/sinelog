# SineLog

SineLog, insanların akıllarında kalan filmleri birbirlerine önerebildiği, ruh haline göre film keşfedebildiği kişisel bir film öneri ve küratör paneli demosudur. Sinema bileti estetiğini sıcak, topluluk odaklı bir deneyimle bir araya getirir.

## Öne çıkan özellikler

- Film, rumuz, tür, ruh hali, izleme grubu, puan ve kişisel notla yeni öneri paylaşma
- Öneri paylaşımından sonra salon ve koltuk bilgili dijital bilet oluşturma
- Sayfanın güncel adresini QR kodla paylaşma ve tek tıkla kopyalama
- Ruh hali, izleme grubu ve film/kişi aramasıyla vitrini filtreleme
- Yayındaki filmler arasından rastgele akşam önerisi alma
- Yönetici panelinde özet metrikler, ruh hali dağılımı ve öneri moderasyonu
- Editör seçimi, yayın/gizleme, silme, UTF-8 BOM destekli CSV indirme ve varsayılan verileri geri yükleme
- Ortak film listesini Firebase Realtime Database REST API üzerinden yükleme ve değişiklikleri kaydetme
- Ağ kesintilerine karşı film verilerini tarayıcının `localStorage` alanında yedekleme
- Harici JavaScript paketi veya kurulum gerektirmeme

## Dosya yapısı

| Dosya | Görev |
| --- | --- |
| `index.html` | Ana arayüz, öneri formu, film vitrini ve modal pencereler |
| `style.css` | Koyu sinematik tema, bilet görünümü ve responsive düzen |
| `app.js` | Film verileri, filtreleme, öneri akışı, kalıcılık ve yönetici işlevleri |

## Kullanım

`index.html` dosyasını güncel bir web tarayıcısında açın. Google Fonts ve karekod görsel servisi için internet erişimi gerekir; fontlar yüklenemediğinde sistem sans-serif yedek fontu kullanılır. Karekod sayfanın açık adresini kodlar; başka cihazlarla paylaşmak için uygulamayı HTTPS destekli bir adreste yayınlayın (`file://` adresleri yalnızca yerel bilgisayarda çalışır).

Yönetici paneli demo şifresi: **`sinema2026`**

Film veritabanı: `https://sinelog-2d99d-default-rtdb.firebaseio.com/movies.json`. İlk açılışta Firebase verisi yüklenir; veritabanı boşsa altı örnek film buraya eklenir. Film ekleme ve moderasyon değişiklikleri ortak listeye kaydedilir. Açık sayfalar en fazla 15 saniyede bir güncellenir; ağ bağlantısı yoksa yerel yedek kullanılır.

Firebase Realtime Database kurallarının uygulamanın ihtiyaç duyduğu okuma/yazma izinlerini vermesi gerekir. Demo yönetici şifresi yalnızca istemci arayüzündeki bir kilittir; herkese açık yayınlarda Firebase yazma izinlerini güvenli kurallarla sınırlandırın. Yönetici panelindeki **Varsayılanlara Sıfırla** düğmesi ortak listedeki verileri başlangıçtaki altı filmle değiştirir.
