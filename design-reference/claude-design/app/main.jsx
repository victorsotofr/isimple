// ─── App Router ───────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = React.useState(() => localStorage.getItem('isimple_page') || 'inbox');
  const go = React.useCallback((p) => { setPage(p); localStorage.setItem('isimple_page', p); }, []);

  const pages = {
    inbox:      <InboxPage />,
    tickets:    <TicketsPage />,
    agenda:     <AgendaPage />,
    properties: <PropertiesPage />,
    tenants:    <LocatairesPage />,
    providers:  <PrestatairesPage />,
    documents:  <DocumentsPage />,
    analytics:  <AnalyticsPage />,
    settings:   <ParametresPage />,
  };

  return (
    <Shell page={page} go={go}>
      {pages[page] || <InboxPage />}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
