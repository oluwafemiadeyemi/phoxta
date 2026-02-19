import { Refine } from "@refinedev/core";

import routerProvider, { NavigateToResource, UnsavedChangesNotifier } from "@refinedev/react-router";

import { BrowserRouter, Routes, Route, Outlet } from "react-router";

import {
  LayoutDashboard,
  Kanban,
  TrendingUp,
  Calendar,
  Building2,
  Users,
  FileText,
  Settings,
  Briefcase,
  ShoppingBag,
  ShoppingCart,
  Package,
  Tag,
  Store,
  Truck,
  UserCheck,
  UserCog,
  Mail,
  Landmark,
  MessageCircle,
} from "lucide-react";

import { RefineAiErrorComponent } from "@crm/components/catch-all";

import { useNotificationProvider } from "@crm/components/refine-ui/notification/use-notification-provider";

import { Toaster } from "@crm/components/refine-ui/notification/toaster";

import { Layout } from "@crm/components/refine-ui/layout/layout";

import { dataProvider } from "@crm/providers/data";
import { authProvider } from "@crm/providers/auth";

import ContactsList from "@crm/pages/contacts/list";
import ContactsCreate from "@crm/pages/contacts/create";
import ContactsEdit from "@crm/pages/contacts/edit";
import ContactsShow from "@crm/pages/contacts/show";
import CompaniesList from "@crm/pages/companies/list";
import CompaniesCreate from "@crm/pages/companies/create";
import CompaniesEdit from "@crm/pages/companies/edit";
import DealsBoard from "@crm/pages/deals/board";
import DealsShow from "@crm/pages/deals/show";
import DealsCreate from "@crm/pages/deals/create";
import DealsEdit from "@crm/pages/deals/edit";
import ProjectsBoard from "@crm/pages/projects/board";
import StaffList from "@crm/pages/staff/list";
import EmailList from "@crm/pages/email/list";
import EmailTemplatesPage from "@crm/pages/email/templates";
import TasksCreate from "@crm/pages/tasks/create";
import TasksEdit from "@crm/pages/tasks/edit";
import CalendarPage from "@crm/pages/calendar";
import DashboardPage from "@crm/pages/dashboard";
import QuotesList from "@crm/pages/quotes/list";
import QuotesCreate from "@crm/pages/quotes/create";
import QuotesEdit from "@crm/pages/quotes/edit";
import QuotesShow from "@crm/pages/quotes/show";
import { SettingsPage } from "@crm/pages/settings";

// E-commerce feature pages
import OrdersList from "@crm/pages/orders/list";
import OrdersShow from "@crm/pages/orders/show";
import ProductsList from "@crm/pages/products/list";
import CategoriesList from "@crm/pages/categories/list";
import StoresList from "@crm/pages/stores/list";
import StoresCreate from "@crm/pages/stores/create";
import StoresEdit from "@crm/pages/stores/edit";
import CouriersList from "@crm/pages/couriers/list";
import CouriersEdit from "@crm/pages/couriers/edit";
import CustomersList from "@crm/pages/customers/list";
import FinancePage from "@crm/pages/finance";
import MessagingPage from "@crm/pages/messaging";

const DEFAULT_LOGO = "/phoxta-logo.png";

const CrmApp = () => {
  const appTitle = "Phoxta CRM";
  const logoUrl = DEFAULT_LOGO;

  return (
    <BrowserRouter basename="/app/crm">
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        notificationProvider={useNotificationProvider}
        options={{
          title: {
            icon: (
              <img src={logoUrl || DEFAULT_LOGO} alt="Logo" className="h-12 w-auto" />
            ),
            text: appTitle,
          },
        }}
        resources={[
          {
            name: "dashboard",
            list: "/dashboard",
            meta: {
              label: "Dashboard",
              icon: <LayoutDashboard />,
            },
          },
          {
            name: "projects",
            list: "/projects/board",
            meta: {
              label: "Tasks",
              icon: <Kanban />,
            },
          },
          // Email parent (collapsible group in sidebar)
          {
            name: "email-group",
            meta: {
              label: "Email",
              icon: <Mail />,
            },
          },
          {
            name: "emails",
            list: "/email",
            meta: {
              label: "Inbox",
              icon: <Mail />,
              parent: "email-group",
            },
          },
          {
            name: "emailTemplates",
            list: "/email/templates",
            meta: {
              label: "Templates",
              icon: <FileText />,
              parent: "email-group",
            },
          },
          // Deals parent (collapsible group in sidebar)
          {
            name: "deals-group",
            meta: {
              label: "Deals",
              icon: <Briefcase />,
            },
          },
          {
            name: "deals",
            list: "/deals/board",
            create: "/deals/create",
            edit: "/deals/edit/:id",
            show: "/deals/show/:id",
            meta: {
              label: "Pipeline",
              icon: <TrendingUp />,
              parent: "deals-group",
            },
          },
          {
            name: "companies",
            list: "/companies",
            create: "/companies/create",
            edit: "/companies/edit/:id",
            meta: {
              icon: <Building2 />,
              parent: "deals-group",
            },
          },
          {
            name: "contacts",
            list: "/contacts",
            create: "/contacts/create",
            edit: "/contacts/edit/:id",
            show: "/contacts/show/:id",
            meta: {
              icon: <Users />,
              parent: "deals-group",
            },
          },
          {
            name: "quotes",
            list: "/quotes",
            create: "/quotes/create",
            edit: "/quotes/edit/:id",
            show: "/quotes/show/:id",
            meta: {
              label: "Quotes",
              icon: <FileText />,
              parent: "deals-group",
            },
          },
          // E-commerce parent (collapsible group in sidebar)
          {
            name: "e-commerce",
            meta: {
              label: "E-Commerce",
              icon: <ShoppingBag />,
            },
          },
          // E-commerce sub-resources
          {
            name: "orders",
            list: "/orders",
            show: "/orders/show/:id",
            meta: {
              label: "Orders",
              icon: <ShoppingCart />,
              parent: "e-commerce",
            },
          },
          {
            name: "products",
            list: "/products",
            meta: {
              label: "Products",
              icon: <Package />,
              parent: "e-commerce",
            },
          },
          {
            name: "categories",
            list: "/categories",
            meta: {
              label: "Categories",
              icon: <Tag />,
              parent: "e-commerce",
            },
          },
          {
            name: "stores",
            list: "/stores",
            create: "/stores/create",
            edit: "/stores/edit/:id",
            show: "/stores/edit/:id",
            meta: {
              label: "Stores",
              icon: <Store />,
              parent: "e-commerce",
            },
          },
          {
            name: "couriers",
            list: "/couriers",
            edit: "/couriers/edit/:id",
            show: "/couriers/edit/:id",
            meta: {
              label: "Couriers",
              icon: <Truck />,
              parent: "e-commerce",
            },
          },
          {
            name: "customers",
            list: "/customers",
            meta: {
              label: "Customers",
              icon: <UserCheck />,
              parent: "e-commerce",
            },
          },
          {
            name: "messaging",
            list: "/messaging",
            meta: {
              label: "Messaging",
              icon: <MessageCircle />,
              parent: "e-commerce",
            },
          },
          {
            name: "finance",
            list: "/finance",
            meta: {
              label: "Finance",
              icon: <Landmark />,
            },
          },
          {
            name: "staff",
            list: "/staff",
            meta: {
              label: "Staff",
              icon: <UserCog />,
            },
          },
          {
            name: "settings",
            list: "/settings",
            meta: {
              label: "Settings",
              icon: <Settings />,
            },
          },
          {
            name: "calendar",
            list: "/calendar",
            meta: {
              label: "Calendar",
              icon: <Calendar />,
              hide: true,
            },
          },
          {
            name: "tasks",
            create: "/tasks/create",
            edit: "/tasks/edit/:id",
            meta: {
              hide: true,
            },
          },
        ]}>
        <Routes>
          <Route
            element={
              <Layout>
                <Outlet />
              </Layout>
            }>
            <Route index element={<NavigateToResource fallbackTo="/dashboard" />} />

            <Route path="/today" element={<NavigateToResource fallbackTo="/dashboard" />} />

            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/contacts" element={<ContactsList />} />
            <Route path="/contacts/create" element={<ContactsCreate />} />
            <Route path="/contacts/edit/:id" element={<ContactsEdit />} />
            <Route path="/contacts/show/:id" element={<ContactsShow />} />

            <Route path="/companies" element={<CompaniesList />} />
            <Route path="/companies/create" element={<CompaniesCreate />} />
            <Route path="/companies/edit/:id" element={<CompaniesEdit />} />

            <Route path="/deals/board" element={<DealsBoard />} />
            <Route path="/deals/create" element={<DealsCreate />} />
            <Route path="/deals/edit/:id" element={<DealsEdit />} />
            <Route path="/deals/show/:id" element={<DealsShow />} />

            <Route path="/projects/board" element={<ProjectsBoard />} />

            <Route path="/staff" element={<StaffList />} />

            <Route path="/email" element={<EmailList />} />
            <Route path="/email/templates" element={<EmailTemplatesPage />} />

            <Route path="/calendar" element={<CalendarPage />} />

            <Route path="/tasks/create" element={<TasksCreate />} />
            <Route path="/tasks/edit/:id" element={<TasksEdit />} />

            <Route path="/quotes" element={<QuotesList />} />
            <Route path="/quotes/create" element={<QuotesCreate />} />
            <Route path="/quotes/edit/:id" element={<QuotesEdit />} />
            <Route path="/quotes/show/:id" element={<QuotesShow />} />

            <Route path="/settings" element={<SettingsPage />} />

            {/* E-commerce feature routes */}
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/show/:id" element={<OrdersShow />} />

            <Route path="/products" element={<ProductsList />} />

            <Route path="/categories" element={<CategoriesList />} />

            <Route path="/stores" element={<StoresList />} />
            <Route path="/stores/create" element={<StoresCreate />} />
            <Route path="/stores/edit/:id" element={<StoresEdit />} />

            <Route path="/couriers" element={<CouriersList />} />
            <Route path="/couriers/edit/:id" element={<CouriersEdit />} />

            <Route path="/customers" element={<CustomersList />} />

            <Route path="/messaging" element={<MessagingPage />} />

            <Route path="/finance" element={<FinancePage />} />

            <Route path="*" element={<RefineAiErrorComponent />} />
          </Route>
        </Routes>
        <Toaster />
        <UnsavedChangesNotifier />
      </Refine>
    </BrowserRouter>
  );
};

export default CrmApp;
