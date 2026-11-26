# Smart Library Management System

React + Vite + Tailwind CSS front end with **Firebase Authentication** and **Cloud Firestore** as the only backend.
Admin/librarian and student roles are enforced in the UI and, more importantly, by Firestore security rules.
No MongoDB, Express or localStorage is used for application data.

## 1. Install and run

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env  (then fill in the values)
npm run dev               # http://localhost:5173
npm run build             # production build in /dist
```

## 2. Firebase setup (about 10 minutes)

1. Go to https://console.firebase.google.com and **Add project** (Analytics not needed).
2. **Build > Authentication > Get started > Sign-in method**: enable **Email/Password**.
3. **Build > Firestore Database > Create database**: choose a region near you, start in **production mode**.
4. **Project settings (gear) > General > Your apps > Web (</>)**: register an app and copy the config into `.env`
   (`VITE_FIREBASE_API_KEY`, etc. See `.env.example`).
5. **Firestore > Rules**: paste the contents of `firestore.rules` and **Publish**.
   (CLI alternative: `npm i -g firebase-tools && firebase login && firebase use <project-id> && firebase deploy --only firestore:rules`.)
6. Restart `npm run dev` after editing `.env`.

> The web API key in `.env` is not a secret by itself; Firestore rules are what protect the data.
> Still keep `.env` out of Git (it is in `.gitignore`).

### Creating the first admin / librarian
Self-registration only creates **students** (the rules reject any other role). To make an admin:
1. Register normally in the app at `/register`.
2. Firebase console > Firestore > `users` > open that user's document > change `role` from `student` to `admin`.
3. Refresh the app. You are taken to the admin console. More admins can be promoted the same way.

## 3. Firestore collections

| Collection | Doc id | Fields |
|---|---|---|
| `users` | Auth UID | `name, email, studentNo, phone, role ('student'/'admin'), createdAt` |
| `books` | auto | `title, author, isbn, category, publisher, year, description, coverUrl, totalCopies, availableCopies, borrowCount, createdAt, updatedAt` |
| `borrowRequests` | auto | `bookId, bookTitle, studentId, studentName, studentEmail, status ('pending'/'approved'/'rejected'/'cancelled'), requestedAt, reviewedBy, reviewedAt, transactionId` |
| `borrowTransactions` | auto | `bookId, bookTitle, bookAuthor, category, studentId, studentName, studentEmail, requestId, issuedBy, issueDate, dueDate, returnDate, status ('issued'/'returned'), fineAmount, overdueDays, createdAt` |
| `fines` | same id as its transaction | `transactionId, studentId, studentName, bookId, bookTitle, amount, overdueDays, status ('pending'/'paid'), paidAt, createdAt` |
| `settings` | `library` | `loanDays, finePerDay, graceDays, maxFine, currency` (optional; defaults apply until an admin saves it on the Fines page) |

No composite indexes are required: queries use at most one equality filter and sort in the browser.

## 4. How the main rules work

- **Stock consistency**: issuing a book (approve request or direct issue), returning it, and editing total copies all use
  Firestore `runTransaction`, so `availableCopies` cannot go negative or drift.
- **Borrowing**: student requests a book (blocked if no copies, or if they already have a pending request or the book on loan).
  Admin approves (stock -1, loan record with issue and due date) or rejects. Admin processes the return (stock +1).
- **Fines**: `fine = (days late - graceDays) x finePerDay`, capped at `maxFine`. Overdue loans show an accruing fine; a fine record is
  created when the late book is returned. Admin marks fines paid or pending.
- **Security rules**: users read only their own profile, requests, loans and fines; only admins write books, loans, fines and settings;
  users cannot change their own role; students can only create `pending` requests for themselves or cancel their own pending request.

## 5. Page map

| Page | Route |
|---|---|
| Landing / Login / Student registration | `/`, `/login`, `/register` |
| Admin: dashboard, books, add/edit book, book details | `/admin`, `/admin/books`, `/admin/books/new`, `/admin/books/:id/edit`, `/admin/books/:id` |
| Admin: students (+ detail), borrow requests, issue/return, fines, history, reports, profile | `/admin/students`, `/admin/students/:id`, `/admin/requests`, `/admin/issue-return`, `/admin/fines`, `/admin/history`, `/admin/reports`, `/admin/profile` |
| Student: dashboard, catalogue, book details, my borrowing, my fines, profile | `/student`, `/student/books`, `/student/books/:id`, `/student/history`, `/student/fines`, `/student/profile` |

## 6. Demo / test checklist

1. Register a student, sign out; promote a second account to admin (see above).
2. Admin: add 3-4 books (try a bad ISBN and year to see validation). Edit one, delete one (confirm dialog).
3. Student: search, filter by category, open a book, **Request to borrow**. Click it again: the button is disabled (duplicate blocked).
4. Admin > Borrow requests: **Approve**. Book's available copies drop by 1; student sees the loan and due date instantly (real-time).
5. Set total copies to the number issued, then try requesting again: blocked as unavailable.
6. Admin > Fines: set loan period to 1 day and grace 0 to test lateness quickly (or edit a loan's `dueDate` in the console to a past date).
   The loan shows as overdue with an accruing fine. **Return** it: stock +1, fine recorded, mark it paid.
7. Reports: charts and CSV export fill from the live data.
8. Try opening `/admin` as a student: you are redirected, and direct Firestore writes are rejected by the rules.

## 7. Notes and limits

- Book covers are image links (no Firebase Storage, so the free Spark plan is enough).
- The "no duplicate active request" check runs in the client before writing; the approval itself is transactional and rechecks
  the request status and stock. For a stricter server guarantee, add a Cloud Function (outside the scope of this lab).
- Search, sort and pagination are done in the browser over the real-time book list, which is fine for lab-sized libraries.
