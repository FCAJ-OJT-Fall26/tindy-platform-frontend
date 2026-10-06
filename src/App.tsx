import { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, useLocation, useNavigate } from 'react-router';
import { Check } from 'lucide-react';

// Layout components
import Sidebar, { navItems } from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileMenuDrawer from './components/layout/MobileMenuDrawer';

// Shared modals
import ActionModal from './components/common/ActionModal';
import WorkspaceProjectDetailModal from './components/projects/WorkspaceProjectDetailModal';

// Screens / Pages
import OverviewScreen from './pages/overview/OverviewScreen';
import SwipeDiscoveryView from './pages/discovery/SwipeDiscoveryView';
import WorkspaceProjectsScreen from './pages/projects/WorkspaceProjectsScreen';
import MessagesScreen from './pages/messages/MessagesScreen';
import TeamScreen from './pages/team/TeamScreen';
import NotificationsScreen from './pages/notifications/NotificationsScreen';
import SettingsScreen from './pages/settings/SettingsScreen';
import ProfileScreen from './pages/profile/ProfileScreen';
import AiStudioScreen from './pages/studio/AiStudioScreen';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import NotFoundPage from './pages/NotFoundPage';
import AuthScreen from './pages/auth/AuthScreen';

// Data types
import { ProjectItem } from './data/projectsData';
import { UserProfile, INITIAL_USER_PROFILE } from './data/profileData';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saved, setSaved] = useState<number[]>([3]);
  const [interested, setInterested] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [detail, setDetail] = useState<ProjectItem | null>(null);
  const [detailSource, setDetailSource] = useState<'projects' | 'saved' | 'overview'>('projects');
  const [selectedConversation, setSelectedConversation] = useState<string>('EcoTrack Team');
  const [modal, setModal] = useState('');
  const [toast, setToast] = useState('');
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  const path = location.pathname;

  const handleOpenProjectMessages = (projectName: string) => {
    setDetail(null);
    const targetChannel = projectName.toLowerCase().includes('studybuddy')
      ? 'StudyBuddy Team'
      : 'EcoTrack Team';
    setSelectedConversation(targetChannel);
    navigate('/messages');
    notify(`Opening ${targetChannel} chat channel`);
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updated }));
  };

  // Dynamic document title update per route
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Overview - Academic Matching',
      '/discover': 'Discover Projects',
      '/candidates': 'Candidate Discovery',
      '/projects': 'My Projects',
      '/saved': 'Saved Projects',
      '/messages': 'Messages',
      '/profile': 'My Profile',
      '/ai-studio': 'AI Studio',
      '/team': 'Team Workspace',
      '/notifications': 'Notifications',
      '/settings': 'System Settings',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms of Service',
    };
    document.title = titles[path] || 'Student Project & Teammate Discovery';
  }, [path]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  const title = navItems.find(item => item.path === path)?.label || ({
    '/profile': 'My profile',
    '/ai-studio': 'AI studio',
    '/notifications': 'Notifications',
    '/settings': 'Settings',
    '/team': 'Team workspace',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Service'
  }[path]) || 'Workspace';

  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 3500);
  };

  const toggleSave = (id: number) => {
    setSaved(old => {
      const exists = old.includes(id);
      notify(exists ? 'Removed from saved collection' : 'Project saved to collection');
      return exists ? old.filter(item => item !== id) : [...old, id];
    });
  };

  const isKnownRoute = [
    '/',
    '/discover',
    '/candidates',
    '/projects',
    '/saved',
    '/messages',
    '/profile',
    '/ai-studio',
    '/team',
    '/notifications',
    '/settings',
    '/privacy',
    '/terms'
  ].includes(path);

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileMenuDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Shell */}
      <div className="main-shell overflow-x-hidden">
        <Header
          title={title}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigateNotifications={() => navigate('/notifications')}
          onNavigateProfile={() => navigate('/profile')}
        />

        <main>
          {/* Custom 404 handler */}
          {!isKnownRoute && <NotFoundPage />}

          {/* Privacy Policy */}
          {path === '/privacy' && <PrivacyPolicy />}

          {/* Terms of Service */}
          {path === '/terms' && <TermsOfService />}

          {/* Discover Projects (Student Mode) */}
          {path === '/discover' && (
            <SwipeDiscoveryView
              initialMode="student"
              onNavigateToMessages={() => navigate('/messages')}
              onNotify={notify}
            />
          )}

          {/* Review Candidates (Leader Mode) */}
          {path === '/candidates' && (
            <SwipeDiscoveryView
              initialMode="leader"
              onNavigateToMessages={() => navigate('/messages')}
              onNotify={notify}
            />
          )}

          {/* Overview Screen */}
          {path === '/' && (
            <OverviewScreen
              saved={saved}
              interested={interested}
              skipped={skipped}
              onToggleSave={toggleSave}
              onSelectDetail={p => {
                setDetail(p);
                setDetailSource('overview');
              }}
              onCreateProject={() => setModal('create')}
              onOpenFilters={() => setModal('filters')}
            />
          )}

          {/* My Projects & Saved Projects */}
          {(path === '/projects' || path === '/saved') && (
            <WorkspaceProjectsScreen
              mode={path === '/projects' ? 'projects' : 'saved'}
              saved={saved}
              onToggleSave={toggleSave}
              onSelectDetail={p => {
                setDetail(p);
                setDetailSource(path === '/projects' ? 'projects' : 'saved');
              }}
              onCreateProject={() => setModal('create')}
              onOpenFilters={() => setModal('filters')}
            />
          )}

          {/* Direct Messages Screen */}
          {path === '/messages' && (
            <MessagesScreen
              selectedConversation={selectedConversation}
              onNavigateTeam={() => navigate('/team')}
              onNotify={notify}
            />
          )}

          {/* Team Workspace Screen */}
          {path === '/team' && (
            <TeamScreen
              onOpenInviteModal={() => setModal('invite')}
              onOpenPositionModal={() => setModal('position')}
              onNavigateMessages={() => navigate('/messages')}
              onNotify={notify}
            />
          )}

          {/* Platform Notifications Screen */}
          {path === '/notifications' && (
            <NotificationsScreen
              onReviewInvite={() => setModal('invitation')}
              onNavigateDiscover={() => navigate('/discover')}
              onNavigateTeam={() => navigate('/team')}
            />
          )}

          {/* System Settings Screen */}
          {path === '/settings' && (
            <SettingsScreen onNotify={notify} />
          )}

          {/* User Profile Screen */}
          {path === '/profile' && (
            <ProfileScreen
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onNotify={notify}
            />
          )}

          {/* AI Studio Screen */}
          {path === '/ai-studio' && (
            <AiStudioScreen
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onNotify={notify}
            />
          )}

          {/* Footer Component */}
          <Footer />
        </main>
      </div>

      {/* Project Detail Modal */}
      <WorkspaceProjectDetailModal
        detail={detail}
        isMyProject={detailSource === 'projects' || (detailSource === 'overview' && detail ? detail.id <= 2 : false)}
        saved={saved}
        interested={interested}
        onClose={() => setDetail(null)}
        onOpenMessages={handleOpenProjectMessages}
        onNavigateTeam={() => {
          setDetail(null);
          navigate('/team');
        }}
        onToggleSave={toggleSave}
        onMarkInterested={id => {
          setInterested([...new Set([...interested, id])]);
          notify('Interest confirmed. Application forwarded to project lead.');
          setDetail(null);
        }}
        onSkip={id => {
          setSkipped([...skipped, id]);
          setDetail(null);
          notify('Project removed from current review session');
        }}
      />

      {/* Action Modals */}
      <ActionModal
        modal={modal}
        onClose={() => setModal('')}
        onAcceptInvitation={() => {
          setModal('');
          navigate('/team');
          notify('Invitation accepted. Welcome to the EcoTrack team.');
        }}
        onDeclineInvitation={() => {
          setModal('');
          notify('Invitation declined');
        }}
        onSubmitForm={modalType => {
          setModal('');
          notify(
            modalType === 'filters'
              ? 'Filters applied to discovery stack'
              : modalType === 'create'
              ? 'Project draft submitted successfully'
              : 'Changes saved'
          );
        }}
      />

      {/* Global Toast */}
      {toast && (
        <div role="status" className="toast">
          <Check size={18} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/login', Component: AuthScreen },
  { path: '*', Component: AppShell }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
