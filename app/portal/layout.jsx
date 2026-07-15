import styles from '@/components/portal/portal.module.css';

export const metadata = {
  title: 'Portal Finanças do Zero — Educação financeira gratuita',
  description: 'Conteúdo prático baseado no método Lucro Primeiro. Acesse aulas e artigos gratuitos sobre finanças pessoais.',
  openGraph: {
    title: 'Portal Finanças do Zero',
    description: 'Educação financeira gratuita baseada no método Lucro Primeiro.',
    url: 'https://zeroapp.tech/portal',
    siteName: 'Finanças do Zero',
    type: 'website'
  }
};

export const viewport = {
  themeColor: '#060c0a'
};

export default function PortalLayout({ children }) {
  return (
    <div className={styles.portalLayout}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Montserrat:wght@900&display=swap"
      />
      {children}
    </div>
  );
}
