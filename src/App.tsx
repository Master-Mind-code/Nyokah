import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { Toast } from './components/common/Toast';
import { VehicleDetailModal } from './components/client/VehicleDetailModal';
import { AuthModal } from './components/auth/AuthModal';
import { WhatsAppSimulatorModal } from './components/common/WhatsAppSimulatorModal';
import { WhatsAppFloatingWidget } from './components/common/WhatsAppFloatingWidget';

// Client Views
import { ClientHome } from './components/client/ClientHome';
import { ClientCatalog } from './components/client/ClientCatalog';
import { BookingTunnel } from './components/client/BookingTunnel';
import { CompanyPortal } from './components/client/CompanyPortal';
import { UserProfileView } from './components/client/UserProfileView';

// Admin Views
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminReservations } from './components/admin/AdminReservations';
import { AdminFleet } from './components/admin/AdminFleet';
import { AdminPricingDiscounts } from './components/admin/AdminPricingDiscounts';
import { AdminPacks } from './components/admin/AdminPacks';
import { AdminCompanies } from './components/admin/AdminCompanies';
import { AdminDriversPartners } from './components/admin/AdminDriversPartners';
import { AdminRides } from './components/admin/AdminRides';

import { Vehicle } from './types';

const MainAppContent: React.FC = () => {
  const { role, clientTab, adminTab, startBookingForVehicle, currentUser } = useApp();
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);

  const handleOpenVehicleModal = (vehicle: Vehicle) => {
    setSelectedVehicleForModal(vehicle);
  };

  const handleCloseVehicleModal = () => {
    setSelectedVehicleForModal(null);
  };

  const handleBookFromModal = (vehicle: Vehicle) => {
    startBookingForVehicle(vehicle);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FD] text-[#1A1C1F]">
      <Toast />

      {/* Global Authentication Modal (Login / Individual Register / Company B2B Register) */}
      <AuthModal />

      {/* Global WhatsApp Live Simulator Modal */}
      <WhatsAppSimulatorModal />

      {/* Global WhatsApp Quick Floating Trigger Button */}
      <WhatsAppFloatingWidget />

      {/* Global Vehicle Detail Modal */}
      <VehicleDetailModal
        vehicle={selectedVehicleForModal}
        onClose={handleCloseVehicleModal}
        onBook={handleBookFromModal}
      />

      {role === 'admin' && currentUser?.type === 'admin' ? (
        // ADMIN BACK-OFFICE SPACE (Secured: Only authenticated Super-Admin)
        <AdminLayout>
          {adminTab === 'dashboard' && <AdminDashboard />}
          {adminTab === 'reservations' && <AdminReservations />}
          {adminTab === 'fleet' && <AdminFleet />}
          {adminTab === 'pricing-discounts' && <AdminPricingDiscounts />}
          {adminTab === 'packs' && <AdminPacks />}
          {adminTab === 'companies' && <AdminCompanies />}
          {adminTab === 'drivers-partners' && <AdminDriversPartners />}
          {adminTab === 'rides' && <AdminRides />}
        </AdminLayout>
      ) : (
        // CLIENT SPACE (Default for visitors & non-admin users)
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            {clientTab === 'home' && (
              <ClientHome onOpenVehicleModal={handleOpenVehicleModal} />
            )}
            {clientTab === 'catalog' && (
              <ClientCatalog onOpenVehicleModal={handleOpenVehicleModal} />
            )}
            {(clientTab === 'booking' || clientTab === 'booking-flow') && (
              <BookingTunnel />
            )}
            {clientTab === 'company-space' && (
              <CompanyPortal />
            )}
            {clientTab === 'user-profile' && (
              <UserProfileView />
            )}
          </main>
          <Footer />
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
