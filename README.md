# HR Manager & Salary Analytics (IP Final 2026)

## Backend (Express)
```
cd backend
npm install
npm start          # http://localhost:3000
```
Login: `admin` / `password123`. All `/api/employees*` routes need header `Authorization: Bearer mock-jwt-token`.

## Frontend (React Native / Expo)
```
cd frontend
npm install
npx expo start           # press w (web), a (Android), or scan QR with Expo Go
```
On a real phone, set `API_URL` in `frontend/src/config.ts` to your computer's LAN IP (e.g. `http://192.168.1.10:3000`).
