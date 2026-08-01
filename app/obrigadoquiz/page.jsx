import Link from 'next/link';
import { ArrowRight, Check, FileText, KeyRound, LockKeyhole } from 'lucide-react';
import styles from './styles.module.css';
import { IRC_DIAGNOSTIC_PATH } from '@/src/modules/irc/domain/irc-next-steps';

export const metadata = {
  title: 'Próximos passos | Finanças do Zero',
  description: 'Seu acesso ao Diagnóstico Completo e ao ZeroApp está sendo preparado.'
};

const LOGIN_PATH = `/?next=${encodeURIComponent(IRC_DIAGNOSTIC_PATH)}`;
const PASSWORD_PATH = `/?next=${encodeURIComponent(IRC_DIAGNOSTIC_PATH)}&mode=recover`;

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
                    <h2>Sua conta já foi criada</h2>
                    <p>
                      Não faça um novo cadastro. Sua compra já foi vinculada ao e-mail informado no pagamento.
                      Agora você só precisa entrar com sua senha ou registrar uma nova senha.
                    </p>
                    <div className={styles.infoBox}>
                      <KeyRound size={20} aria-hidden="true" />
                      <p>
                        Se você já usa o ZeroApp, mantenha sua senha atual. Se é seu primeiro acesso ou
                        não sabe a senha, use “Criar ou redefinir minha senha”.
                      </p>
                    </div>
                    <div className={styles.accessActions}>
                      <Link className={styles.primaryButton} href={LOGIN_PATH}>
                        JÁ TENHO SENHA — ENTRAR
                        <ArrowRight size={22} aria-hidden="true" />
                      </Link>
                      <Link className={styles.secondaryButton} href={PASSWORD_PATH}>
                        CRIAR OU REDEFINIR MINHA SENHA
                      </Link>
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
                    <Link className={styles.primaryButton} href={IRC_DIAGNOSTIC_PATH}>
                      ENTRAR E FAZER MEU DIAGNÓSTICO
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
                      disponível dentro do ZeroApp. Em seguida, você será direcionado para a aula de
                      uso da Planilha Financeira e começará a organizar o mês.
                    </p>
                    <div className={styles.reportSummary}>
                      <FileText size={22} aria-hidden="true" />
                      <span>Relatório, ZeroApp e aula prática da Planilha Financeira no mesmo fluxo.</span>
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
