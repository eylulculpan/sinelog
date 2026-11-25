# SineLog

SineLog, insanların akıllarında kalan filmleri birbirlerine önerebildiği, ruh haline göre film keşfedebildiği kişisel bir film öneri ve küratör paneli demosudur. Sinema bileti estetiğini sıcak, topluluk odaklı bir deneyimle bir araya getirir.

## Öne çıkan özellikler

- Film, rumuz, tür, ruh hali, izleme grubu, puan ve kişisel notla yeni öneri paylaşma
- Öneri paylaşımından sonra salon ve koltuk bilgili dijital bilet oluşturma
- Ruh hali, izleme grubu ve film/kişi aramasıyla vitrini filtreleme
- Yayındaki filmler arasından rastgele akşam önerisi alma
- Yönetici panelinde özet metrikler, ruh hali dağılımı ve öneri moderasyonu
- Editör seçimi, yayın/gizleme, silme, UTF-8 BOM destekli CSV indirme ve varsayılan verileri geri yükleme
- Verileri tarayıcının `localStorage` alanında saklama; harici paket veya kurulum gerektirmeme

## Dosya yapısı

| Dosya | Görev |
| --- | --- |
| `index.html` | Ana arayüz, öneri formu, film vitrini ve modal pencereler |
| `style.css` | Koyu sinematik tema, bilet görünümü ve responsive düzen |
| `app.js` | Film verileri, filtreleme, öneri akışı, kalıcılık ve yönetici işlevleri |

## Kullanım

`index.html` dosyasını güncel bir web tarayıcısında açın. Google Fonts bağlantısı için internet erişimi gerekir; fontlar yüklenemediğinde sistem sans-serif yedek fontu kullanılır.

Yönetici paneli demo şifresi: **`sinema2026`**

İlk açılışta altı örnek film tarayıcı depolamasına eklenir. Yönetici panelindeki **Varsayılanlara Sıfırla** düğmesi bu örnek listeyi yeniden yükler.
