# Todo Platform — Başlangıç

Bu ZIP dosyası lokal olarak çalıştırabileceğiniz bir starter repo içerir:
- Next.js frontend
- Express backend (auth + projects/tasks)
- PostgreSQL + Redis
- Docker Compose

## Başlatma (Docker)
1. Dosyaları çıkartın ve dizine gidin:
   ```
   unzip todo-platform-starter.zip -d todo-platform-starter
   cd todo-platform-starter
   ```
2. `.env.example` dosyasını kopyalayın ve değerleri güncelleyin:
   ```
   cp .env.example .env
   ```
3. Docker Compose ile çalıştırın:
   ```
   docker compose up --build
   ```
4. Postgres ayağa kalktıktan sonra DB migration çalıştırın (psql ile `infra/init.sql`):
   ```
   docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -f /usr/src/app/infra/init.sql
   ```
   (Alternatif: yerel psql kullanın.)

5. Frontend: http://localhost:3000
   Backend: http://localhost:4000

## Notlar
- Production için: HTTPS, secure cookies, helmet, rate-limit, güçlü şifre kuralları, email sağlayıcısı ayarları gereklidir.
- Eğer isterseniz ben bu repo'yu GitHub'a push etmeniz veya Render/Vercel'e deploy etmeniz için adım adım yardımcı olurum.
