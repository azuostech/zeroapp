import Link from 'next/link';
import { ArrowRight, Check, FileText, LockKeyhole, Mail } from 'lucide-react';
import styles from './styles.module.css';

export const metadata = {
  title: 'Próximos passos | Finanças do Zero',
  description: 'Seu acesso ao Diagnóstico Completo e ao ZeroApp está sendo preparado.'
};

const DIAGNOSTIC_PATH = '/diagnostico-completo';

function JacksonMessage({ children, highlight = false }) {
  return (
    <div className={styles.messageRow}>
      <span className={styles.messageAvatar} aria-hidden="true">JS</span>
      <div className={`${styles.messageBubble} ${highlight ? styles.messageBubbleHighlight : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function ObrigadoQuizPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.headerAvatar} aria-hidden="true">JS</span>
          <div className={styles.headerCopy}>
            <strong>Diagnóstico Finanças do Zero</strong>
            <span>Jackson Souza</span>
          </div>
          <span className={styles.progress}>6 de 6</span>
        </div>
        <div className={styles.progressLine} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <div className={styles.conversation}>
          <JacksonMessage highlight>
            <strong>Seja muito bem-vindo(a)!</strong>
            <p>
              Seu pagamento foi aprovado. A partir de agora, você começa uma nova etapa da sua
              jornada no Finanças do Zero.
            </p>
          </JacksonMessage>

          <JacksonMessage>
            <p>
              Sua conta e seu acesso são preparados automaticamente. Siga os passos abaixo na ordem
              e eu vou te acompanhar em cada um deles.
            </p>
          </JacksonMessage>

          <div className={styles.cardRow}>
            <span className={styles.messageAvatar} aria-hidden="true">JS</span>
            <section className={styles.stepsCard} aria-labelledby="next-steps-title">
              <div className={styles.cardHeading}>
                <span className={styles.successIcon} aria-hidden="true"><Check size={38} strokeWidth={3} /></span>
                <div>
                  <span>PAGAMENTO APROVADO</span>
                  <h1 id="next-steps-title">Seus próximos passos</h1>
                </div>
              </div>

              <ol className={styles.timeline}>
                <li className={`${styles.step} ${styles.activeStep}`}>
                  <span className={styles.stepNumber}>1</span>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Comece por aqui</span>
                    <h2>Ative seu acesso ao ZeroApp</h2>
                    <p>
                      Se este é seu primeiro acesso, procure pelo convite que enviamos ao e-mail usado
                      na compra e defina sua senha. Se você já usa o ZeroApp, sua compra será vinculada
                      à mesma conta.
                    </p>
                    <div className={styles.infoBox}>
                      <Mail size={20} aria-hidden="true" />
                      <p>
                        O e-mail pode levar alguns minutos. Confira também as pastas Spam, Promoções
                        e Lixo eletrônico.
                      </p>
                    </div>
                  </div>
                </li>

                <li className={styles.step}>
                  <span className={styles.stepNumber}>2</span>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Acesso liberado</span>
                    <h2>Responda ao diagnóstico completo</h2>
                    <p>
                      Entre com o mesmo e-mail da compra e responda às 12 perguntas com calma e
                      sinceridade. Seu progresso ficará salvo automaticamente.
                    </p>
                    <div className={styles.infoBox}>
                      <LockKeyhole size={20} aria-hidden="true" />
                      <p>
                        O ZeroApp confirma seu pagamento com segurança antes de liberar o diagnóstico.
                        Você não precisará preencher seus dados novamente.
                      </p>
                    </div>
                    <Link className={styles.primaryButton} href={DIAGNOSTIC_PATH}>
                      ACESSAR MEU DIAGNÓSTICO
                      <ArrowRight size={22} aria-hidden="true" />
                    </Link>
                  </div>
                </li>

                <li className={styles.step}>
                  <span className={styles.stepNumber}>3</span>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Depois do diagnóstico</span>
                    <h2>Receba sua análise e continue no ZeroApp</h2>
                    <p>
                      Depois da última resposta, sua análise personalizada será gerada e ficará
                      disponível na sua conta. Você também receberá o relatório em PDF por e-mail.
                    </p>
                    <div className={styles.reportSummary}>
                      <FileText size={22} aria-hidden="true" />
                      <span>Relatório personalizado, PDF privado e próximos movimentos.</span>
                    </div>
                  </div>
                </li>
              </ol>

              <footer className={styles.footer}>
                <strong>Seu acesso está protegido.</strong>
                <span>Somente a conta vinculada à compra poderá abrir o diagnóstico.</span>
              </footer>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
