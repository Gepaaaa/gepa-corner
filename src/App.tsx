import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Links } from './components/Links';
import { Support } from './components/Support';
import { Footer } from './components/Footer';
import { MusicPlayer } from './components/MusicPlayer';
import { AuthModal } from './components/modals/AuthModal';
import { AccountModal } from './components/modals/AccountModal';
import { SupportModal } from './components/modals/SupportModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { AgeModal } from './components/modals/AgeModal';
import { LocationModal } from './components/modals/LocationModal';
import { HobbyModal } from './components/modals/HobbyModal';
import { PrivacyModal, TermsModal } from './components/modals/LegalModals';
import { Donation, ProfileData, RankingData } from './types';

export interface MainAppProps {
  initialProfile?: ProfileData;
  initialLeaderboard?: RankingData;
}

export const MainApp: React.FC<MainAppProps> = ({
  initialProfile,
  initialLeaderboard
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [ageModalOpen, setAgeModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [hobbyModalOpen, setHobbyModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const [activeInvoiceOrderId, setActiveInvoiceOrderId] = useState<string | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<Donation | null>(null);

  const isAnyModalOpen =
    authModalOpen ||
    accountModalOpen ||
    supportModalOpen ||
    invoiceModalOpen ||
    ageModalOpen ||
    locationModalOpen ||
    hobbyModalOpen ||
    privacyModalOpen ||
    termsModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isAnyModalOpen]);

  const handleOpenInvoice = (orderId: string, data?: Donation) => {
    setActiveInvoiceOrderId(orderId);
    setActiveInvoiceData(data || null);
    setInvoiceModalOpen(true);
  };

  const scrollToRanking = () => {
    const el = document.getElementById('support');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenAccount={() => setAccountModalOpen(true)}
      />

      <main>
        <Hero />
        <About
          onOpenAgeModal={() => setAgeModalOpen(true)}
          onOpenLocationModal={() => setLocationModalOpen(true)}
          onOpenHobbyModal={() => setHobbyModalOpen(true)}
        />
        <Links />
        <Support
          onOpenSupportModal={() => setSupportModalOpen(true)}
          onOpenAccountModal={() => setAccountModalOpen(true)}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          initialRankingData={initialLeaderboard}
        />
      </main>

      <Footer
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
      />

      <MusicPlayer />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onOpenSupport={() => setSupportModalOpen(true)}
        onSelectInvoice={handleOpenInvoice}
      />

      <SupportModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onPaymentSuccess={(orderId, statusData) => handleOpenInvoice(orderId, statusData)}
      />

      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        orderId={activeInvoiceOrderId}
        donationData={activeInvoiceData}
        onScrollToRanking={scrollToRanking}
      />

      <AgeModal
        isOpen={ageModalOpen}
        onClose={() => setAgeModalOpen(false)}
      />

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
      />

      <HobbyModal
        isOpen={hobbyModalOpen}
        onClose={() => setHobbyModalOpen(false)}
      />

      <PrivacyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />

      <TermsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
      />
    </>
  );
};

export const App: React.FC<MainAppProps> = (props) => {
  return (
    <ToastProvider>
      <AuthProvider>
        <MusicProvider>
          <MainApp {...props} />
        </MusicProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
