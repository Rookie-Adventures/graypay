 ✓ Compiled /api/noveltypay/qrcode in 171ms (64 modules)
[2025-08-23T22:04:15.883Z] [INFO] NoveltyPay QR API 请求 {"amount":1990,"currency":"CNY","vendor":"wechatpay","ip":"::1","userAgent":"Next.js Middleware"}
[2025-08-23T22:04:15.884Z] [INFO] CNY固定汇率转换(微信) {"originalAmount":1990,"originalCurrency":"CNY","convertedAmount":275.24,"convertedCurrency":"USD","cnyPerUsd":7.23,"slippageBuffer":0}
prisma:query db.Payment.insertOne({ reference: "NP_QR1755986655884b3gdne", status: "pending", amount: 27524, currency: "USD", plan: "support-1990", description: "support-1990 Payment - NoveltyPay(WeChat) | Original: 1990 CNY -> 275.24 USD (Rate: 7.23)", locale: "en", providerResponse: "{"request":"novelty-qrcode-init","vendor":"wechatpay","provider":"noveltypay","originalAmount":1990,"originalCurrency":"CNY","finalAmount":275.24,"finalCurrency":"USD","exchangeRate":7.23,"isRealTimeRate":false,"note":"NoveltyPay微信支付使用美元结算，后端安全汇率转换"}", ipnReceived: false, callbackReceived: false, createdAt: DateTime("2025-08-23 22:04:15.887 +00:00:00"), updatedAt: DateTime("2025-08-23 22:04:15.887 +00:00:00"), })
prisma:query db.Payment.aggregate([ { $match: { $expr: { $and: [ { $and: [ { $eq: [ "$_id", { $literal: ObjectId("68aa3adf7b9ff642b5f0838f"), }, ], }, { $ne: [ "$_id", "$$REMOVE", ], }, ], }, ], }, }, }, { $project: { _id: 1, reference: 1, transactionId: 1, userId: 1, status: 1, amount: 1, currency: 1, plan: 1, description: 1, locale: 1, customerEmail: 1, providerResponse: 1, ipnReceived: 1, callbackReceived: 1, completedAt: 1, createdAt: 1, updatedAt: 1, payment_method: 1, ordernum: 1, trade_status: 1, qrcode_url: 1, client_ip: 1, display_amount: 1, display_currency: 1, }, }, ])    
[2025-08-23T22:04:15.899Z] [INFO] NoveltyPay支付记录创建成功 {"reference":"NP_QR1755986655884b3gdne","originalAmount":1990,"originalCurrency":"CNY","finalAmount":275.24,"finalCurrency":"USD","exchangeRate":7.23,"isRealTimeRate":false}  
[2025-08-23T22:04:15.899Z] [INFO] 准备传递给NoveltyPay的金额信息 {"originalAmount":1990,"originalCurrency":"CNY","finalAmount":275.24,"finalCurrency":"USD","totalFeeCents":27524,"exchangeRate":7.23,"isRealTimeRate":false}
[2025-08-23T22:04:15.899Z] [INFO] Callback/Notify preview {"callbackUrl":"http://localhost:3000/payment/success?reference=NP_QR1755986655884b3gdne&amount=1990&currency=CNY&plan=support-1990&duration=oneoff&vendor=wechatpay","notifyUrl":"http://localhost:3000/api/noveltypay/ipn"}
[2025-08-23T22:04:15.899Z] [WARN] PAYMENT_DRY_RUN 启用：跳过调用 NoveltyPay {"reference":"NP_QR1755986655884b3gdne","callback_origin":"http://localhost:3000","notify_origin":"http://localhost:3000"}
 POST /api/noveltypay/qrcode 200 in 767ms
 ✓ Compiled /api/payment/status in 104ms (66 modules)
prisma:query db.Payment.aggregate([ { $match: { $expr: { $and: [ { $and: [ { $and: [ { $eq: [ "$reference", { $literal: "NP_QR1755986655884b3gdne", }, ], }, { $ne: [ "$reference", "$$REMOVE", ], }, ], }, ], }, { }, ], }, }, }, { $project: { _id: 1, status: 1, amount: 1, currency: 1, plan: 1, updatedAt: 1, createdAt: 1, }, }, ])
[2025-08-23T22:04:18.392Z] [INFO] Payment status queried {"reference":"NP_QR1755986655884b3gdne","status":"pending","effectiveStatus":"pending"}
 GET /api/payment/status?reference=NP_QR1755986655884b3gdne 200 in 141ms
(node:2124) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ○ Compiling /[locale] ...
 ✓ Compiled /[locale] in 4s (1460 modules)
 ✓ Compiled in 432ms (661 modules)
 ✓ Compiled in 188ms (647 modules)
 GET /zh 200 in 4694ms
 ○ Compiling /api/auth/[...nextauth] ...
 ✓ Compiled /api/auth/[...nextauth] in 713ms (1065 modules)
 GET /api/auth/session 200 in 1996ms
 GET /api/auth/session 200 in 2014ms
 ○ Compiling /[locale]/services/ai-support ...
 ✓ Compiled /[locale]/services/ai-support in 613ms (1761 modules)
 ○ Compiling /[locale]/payment/select-method ...
 ✓ Compiled /[locale]/payment/select-method in 521ms (1803 modules)
 GET /zh/payment/select-method?plan=support-990&amount=990&currency=CNY&duration=oneoff 200 in 1002ms
 GET /api/auth/session 200 in 73ms
 GET /api/auth/session 200 in 21ms
[2025-08-23T22:04:46.300Z] [INFO] NoveltyPay QR API 请求 {"amount":990,"currency":"CNY","vendor":"wechatpay","ip":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0"}        
[2025-08-23T22:04:46.301Z] [INFO] CNY固定汇率转换(微信) {"originalAmount":990,"originalCurrency":"CNY","convertedAmount":136.92,"convertedCurrency":"USD","cnyPerUsd":7.23,"slippageBuffer":0}
prisma:query db.Payment.insertOne({ reference: "NP_QR1755986686301mhltum", status: "pending", amount: 13692, currency: "USD", plan: "support-990", description: "support-990 Plan - oneoff | Original: 990 CNY -> 136.92 USD (Rate: 7.23)", locale: "en", customerEmail: "123@123.com", providerResponse: "{"request":"novelty-qrcode-init","vendor":"wechatpay","provider":"noveltypay","originalAmount":990,"originalCurrency":"CNY","finalAmount":136.92,"finalCurrency":"USD","exchangeRate":7.23,"isRealTimeRate":false,"note":"NoveltyPay微信支付使用美元结算，后端安全汇率转换"}", ipnReceived: false, callbackReceived: false, createdAt: DateTime("2025-08-23 22:04:46.304 +00:00:00"), updatedAt: DateTime("2025-08-23 22:04:46.304 +00:00:00"), })
prisma:query db.Payment.aggregate([ { $match: { $expr: { $and: [ { $and: [ { $eq: [ "$_id", { $literal: ObjectId("68aa3afe7b9ff642b5f08390"), }, ], }, { $ne: [ "$_id", "$$REMOVE", ], }, ], }, ], }, }, }, { $project: { _id: 1, reference: 1, transactionId: 1, userId: 1, status: 1, amount: 1, currency: 1, plan: 1, description: 1, locale: 1, customerEmail: 1, providerResponse: 1, ipnReceived: 1, callbackReceived: 1, completedAt: 1, createdAt: 1, updatedAt: 1, payment_method: 1, ordernum: 1, trade_status: 1, qrcode_url: 1, client_ip: 1, display_amount: 1, display_currency: 1, }, }, ])    
[2025-08-23T22:04:46.309Z] [INFO] NoveltyPay支付记录创建成功 {"reference":"NP_QR1755986686301mhltum","originalAmount":990,"originalCurrency":"CNY","finalAmount":136.92,"finalCurrency":"USD","exchangeRate":7.23,"isRealTimeRate":false}   
[2025-08-23T22:04:46.309Z] [INFO] 准备传递给NoveltyPay的金额信息 {"originalAmount":990,"originalCurrency":"CNY","finalAmount":136.92,"finalCurrency":"USD","totalFeeCents":13692,"exchangeRate":7.23,"isRealTimeRate":false}
[2025-08-23T22:04:46.309Z] [INFO] Callback/Notify preview {"callbackUrl":"http://localhost:3000/payment/success?reference=NP_QR1755986686301mhltum&amount=990&currency=CNY&plan=support-990&duration=oneoff&vendor=wechatpay","notifyUrl":"http://localhost:3000/api/noveltypay/ipn"}
[2025-08-23T22:04:46.309Z] [WARN] PAYMENT_DRY_RUN 启用：跳过调用 NoveltyPay {"reference":"NP_QR1755986686301mhltum","callback_origin":"http://localhost:3000","notify_origin":"http://localhost:3000"}
 POST /api/noveltypay/qrcode 200 in 39ms
