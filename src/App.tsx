import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { VisaListPage } from './pages/VisaListPage';
import { VisaDetailsPage } from './pages/VisaDetailsPage';
import { OfficesPage } from './pages/OfficesPage';
import { OfficeDetailsPage } from './pages/OfficeDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { CustomersHubPage } from './pages/CustomersHubPage';
import { AccountsPage } from './pages/AccountsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { VisaProfitPage } from './pages/VisaProfitPage';
import { ProfitsPage } from './pages/ProfitsPage';
import { VisaTypesPage } from './pages/VisaTypesPage';
import { PassportListPage } from './pages/PassportListPage';
import { PassportDetailsPage } from './pages/PassportDetailsPage';
import { PassportTypesPage } from './pages/PassportTypesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CurrenciesPage } from './pages/CurrenciesPage';
import { AirlinesPage } from './pages/AirlinesPage';
import { AirlineDetailsPage } from './pages/AirlineDetailsPage';
import { AirlineReportPage } from './pages/AirlineReportPage';
import { VisaReportPage } from './pages/VisaReportPage';
import { AirlineTopupsPage } from './pages/AirlineTopupsPage';
import { FlightTicketsListPage } from './pages/FlightTicketsListPage';
import { FlightTicketDetailsPage } from './pages/FlightTicketDetailsPage';
import { FlightTicketCreatePage } from './pages/FlightTicketCreatePage';
import { ExternalTicketsListPage } from './pages/ExternalTicketsListPage';
import { ExternalTicketDetailsPage } from './pages/ExternalTicketDetailsPage';
import { ServiceSalesPage } from './pages/ServiceSalesPage';
import { ServiceSaleDetailsPage } from './pages/ServiceSaleDetailsPage';
import { HotelBookingsPage } from './pages/HotelBookingsPage';
import { HotelBookingDetailsPage } from './pages/HotelBookingDetailsPage';
import { TripsPage } from './pages/TripsPage';
import { TripDetailsPage } from './pages/TripDetailsPage';
import { LeadDetailsPage } from './pages/LeadDetailsPage';
import { LeadsReportPage } from './pages/LeadsReportPage';
import { CashReportPage } from './pages/CashReportPage';
import { OfficeReportPage } from './pages/OfficeReportPage';
import { OfficesRankingReportPage } from './pages/OfficesRankingReportPage';
import { EmployeeMonthlyReportPage } from './pages/EmployeeMonthlyReportPage';
import { DebtsReportPage } from './pages/DebtsReportPage';
import { LegacyTicketAdjustmentsPage } from './pages/LegacyTicketAdjustmentsPage';
import { LegacyExternalTicketAdjustmentsPage } from './pages/LegacyExternalTicketAdjustmentsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import { LeavesPage } from './pages/LeavesPage';
import { LeaveCalendarPage } from './pages/LeaveCalendarPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import { ArchivePage } from './pages/ArchivePage';
import { BackupPage } from './pages/BackupPage';
import { ProtectedLayout } from './layout/ProtectedLayout';
import { RoleGuard } from './components/RoleGuard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Notifications - accessible by all authenticated users */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
        
        <Route path="/flight-tickets" element={<RoleGuard allow={['employee','visa_admin','passport_admin','airline_admin','accounting','admin']}><FlightTicketsListPage /></RoleGuard>} />
        <Route path="/flight-tickets/new" element={<RoleGuard allow={['employee','visa_admin','passport_admin','airline_admin','accounting','admin']}><FlightTicketCreatePage /></RoleGuard>} />
        <Route path="/flight-tickets/:id" element={<RoleGuard allow={['employee','visa_admin','passport_admin','airline_admin','accounting','admin']}><FlightTicketDetailsPage /></RoleGuard>} />
        <Route path="/external-tickets" element={<RoleGuard allow={['employee','airline_admin','accounting','admin']}><ExternalTicketsListPage /></RoleGuard>} />
        <Route path="/external-tickets/:id" element={<RoleGuard allow={['employee','airline_admin','accounting','admin']}><ExternalTicketDetailsPage /></RoleGuard>} />
        <Route path="/service-sales" element={<RoleGuard allow={['employee','accounting','admin']}><ServiceSalesPage /></RoleGuard>} />
        <Route path="/service-sales/:id" element={<RoleGuard allow={['employee','accounting','admin']}><ServiceSaleDetailsPage /></RoleGuard>} />
        <Route path="/hotel-bookings" element={<RoleGuard allow={['employee','accounting','admin']}><HotelBookingsPage /></RoleGuard>} />
        <Route path="/hotel-bookings/:id" element={<RoleGuard allow={['employee','accounting','admin']}><HotelBookingDetailsPage /></RoleGuard>} />
        <Route path="/trips" element={<RoleGuard allow={['employee','accounting','admin']}><TripsPage /></RoleGuard>} />
        <Route path="/trips/:id" element={<RoleGuard allow={['employee','accounting','admin']}><TripDetailsPage /></RoleGuard>} />
        {/* Backward-compat: /leads now opens the unified Customers Hub (Follow-up tab) */}
        <Route
          path="/leads"
          element={
            <RoleGuard allow={['employee','visa_admin','passport_admin','airline_admin','accounting','admin']}>
              <CustomersHubPage defaultTab="followup" />
            </RoleGuard>
          }
        />
        <Route path="/leads/reports" element={<RoleGuard allow={['accounting','admin']}><LeadsReportPage /></RoleGuard>} />
        <Route path="/leads/:id" element={<LeadDetailsPage />} />
        <Route path="/visa" element={<VisaListPage />} />
        <Route path="/visa/:id" element={<VisaDetailsPage />} />
        <Route path="/passport" element={<RoleGuard allow={['employee','passport_admin','accounting','admin']}><PassportListPage /></RoleGuard>} />
        <Route path="/passport/:id" element={<RoleGuard allow={['employee','passport_admin','accounting','admin']}><PassportDetailsPage /></RoleGuard>} />
        {/* Offices - all admins can see office info, financial details are restricted in the page itself */}
        <Route path="/offices" element={<RoleGuard allow={['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin']}><OfficesPage /></RoleGuard>} />
        <Route path="/offices/:id" element={<RoleGuard allow={['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin']}><OfficeDetailsPage /></RoleGuard>} />
        {/* Customers Hub (Customers directory + Follow-up) */}
        <Route
          path="/customers"
          element={
            <RoleGuard allow={['employee','visa_admin','visa_admin_2','passport_admin','airline_admin','accounting','admin']}>
              <CustomersHubPage />
            </RoleGuard>
          }
        />
        {/* Optional: old customers list (ledger entry point) */}
        <Route path="/customers-ledger" element={<RoleGuard allow={['accounting','admin']}><CustomersPage /></RoleGuard>} />
        <Route path="/customers/:id" element={<RoleGuard allow={['accounting','admin']}><CustomerDetailsPage /></RoleGuard>} />
        {/* Backward compat */}
        <Route path="/partners" element={<Navigate to="/offices" replace />} />
        <Route path="/accounts" element={<RoleGuard allow={['accounting','admin']}><AccountsPage /></RoleGuard>} />
        <Route path="/expenses" element={<RoleGuard allow={['accounting','admin']}><ExpensesPage /></RoleGuard>} />
        <Route path="/currencies" element={<RoleGuard allow={['accounting','admin']}><CurrenciesPage /></RoleGuard>} />
        {/* New Profits page - combines all profits */}
        <Route path="/profits" element={<RoleGuard allow={['admin']}><ProfitsPage /></RoleGuard>} />
        {/* Keep old route for backward compat */}
        <Route path="/visa-profit" element={<RoleGuard allow={['accounting','admin']}><VisaProfitPage /></RoleGuard>} />
        <Route path="/visa-types" element={<RoleGuard allow={['visa_admin','visa_admin_2','admin']}><VisaTypesPage /></RoleGuard>} />
        <Route path="/passport-types" element={<RoleGuard allow={['passport_admin','admin']}><PassportTypesPage /></RoleGuard>} />
        {/* Airlines - also accessible by airline_admin */}
        <Route path="/airlines" element={<RoleGuard allow={['airline_admin','accounting','admin']}><AirlinesPage /></RoleGuard>} />
        <Route path="/airlines/:id" element={<RoleGuard allow={['airline_admin','accounting','admin']}><AirlineDetailsPage /></RoleGuard>} />
        <Route path="/airline-topups" element={<RoleGuard allow={['airline_admin','accounting','admin']}><AirlineTopupsPage /></RoleGuard>} />
        <Route path="/employees" element={<RoleGuard allow={['accounting','admin']}><EmployeesPage /></RoleGuard>} />
        {/* Leaves */}
        <Route path="/leaves" element={<RoleGuard allow={['employee','visa_admin','passport_admin','airline_admin','accounting','admin']}><LeavesPage /></RoleGuard>} />
        <Route path="/leaves/calendar" element={<RoleGuard allow={['admin', 'airline_admin']}><LeaveCalendarPage /></RoleGuard>} />
        {/* Reports */}
        <Route path="/reports/airline/:id" element={<RoleGuard allow={['accounting','admin','airline_admin']}><AirlineReportPage /></RoleGuard>} />
        <Route path="/reports/visa-daily" element={<RoleGuard allow={['visa_admin','admin']}><VisaReportPage /></RoleGuard>} />
        <Route path="/reports/cash" element={<RoleGuard allow={['accounting','admin']}><CashReportPage /></RoleGuard>} />
        <Route path="/reports/debts" element={<RoleGuard allow={['accounting','admin']}><DebtsReportPage /></RoleGuard>} />
        <Route path="/reports/offices-ranking" element={<RoleGuard allow={['accounting','admin']}><OfficesRankingReportPage /></RoleGuard>} />
        <Route path="/reports/office/:id" element={<RoleGuard allow={['accounting','admin']}><OfficeReportPage /></RoleGuard>} />
        <Route path="/reports/employees" element={<RoleGuard allow={['admin']}><EmployeeMonthlyReportPage /></RoleGuard>} />
        <Route path="/archive" element={<RoleGuard allow={['admin']}><ArchivePage /></RoleGuard>} />
        <Route path="/backup" element={<RoleGuard allow={['accounting','admin']}><BackupPage /></RoleGuard>} />
        <Route path="/legacy-tickets" element={<RoleGuard allow={['employee','visa_admin','visa_admin_2','sub_visa_admin','passport_admin','airline_admin','accounting','admin']}><LegacyTicketAdjustmentsPage /></RoleGuard>} />
        <Route path="/legacy-external-tickets" element={<RoleGuard allow={['employee','visa_admin','visa_admin_2','sub_visa_admin','passport_admin','airline_admin','accounting','admin']}><LegacyExternalTicketAdjustmentsPage /></RoleGuard>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
