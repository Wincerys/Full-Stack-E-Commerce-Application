export default function NotFoundPage() {
  return (
    <main className="notfound__wrapper">
      <div className="notfound__card">
        <h1 className="notfound__title">404</h1>
        <p className="notfound__message">
          Sorry, the page you’re looking for doesn’t exist.
        </p>
        <a href="/" className="btn-primary">Go back home</a>
      </div>
    </main>
  );
}
