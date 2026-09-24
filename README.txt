КАЛКУЛАТОР ЗА ГРАДБА – V14

Што има V14:
- Сите функции од V13.
- Excel export останува со XLSX библиотеката што работеше во V13.
- Mobile/responsive интерфејс за Android телефон.
- PWA manifest + service worker (работи кога апликацијата е на HTTPS/localhost).
- Google Drive секција.
- Sync на JSON state + Excel фајл во Drive folder „Калкулатор за градба“.
- Restore од Drive.

ВАЖНО ЗА GOOGLE DRIVE:
1. Направи Google Cloud project.
2. Enable Google Drive API.
3. Направи OAuth 2.0 Client ID -> Web application.
4. Во Authorized JavaScript origins стави ја HTTPS адресата каде што ќе биде објавена апликацијата.
5. Во апликацијата -> ☁️ Drive внеси го Client ID.
6. Не внесувај Client Secret.
7. Притисни „Поврзи / Синхронизирај“.

ВАЖНО:
- Google OAuth и PWA не се сигурни кога index.html се отвора како file://.
- За користење од телефон + лаптоп истовремено, апликацијата треба да биде објавена на HTTPS (пример GitHub Pages).
- V14 сега ја има подготвено Drive интеграцијата; следниот чекор е deployment на HTTPS адреса и внесување на OAuth origin.

Локалните податоци се чуваат со истиот localStorage key како претходните верзии, па постоечките податоци треба да останат достапни.
