"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { useApp } from '../context/AppContext';
import { useUser } from '@clerk/nextjs';
import { useTranslation } from 'react-i18next';
// 👇 ĐÃ THÊM ICON GLOBE VÀO ĐÂY 👇
import { ChevronDown, Settings, LogOut, TrendingUp, Pin, Flag, List, X, AlertCircle, Globe } from 'lucide-react';

import SettingsModal from './SettingsModal';
import UserProfileModal from './UserProfileModal';
import CreateChannelModal from './CreateChannelModal';
import ServerSettingsModal from './ServerSettingsModal';
import ModerationModal from './ModerationModal';
import UpgradeServerModal from './UpgradeServerModal';
import BrowseChannelsModal from './BrowseChannelsModal';

const LEVEL_REQUIREMENTS = [
  { level: 0, totalStones: 0 }, { level: 1, totalStones: 1 }, { level: 2, totalStones: 3 },
  { level: 3, totalStones: 5 }, { level: 4, totalStones: 8 }, { level: 5, totalStones: 11 },
  { level: 6, totalStones: 15 }, { level: 7, totalStones: 19 }, { level: 8, totalStones: 23 },
  { level: 9, totalStones: 28 }, { level: 10, totalStones: 33 }
];

export default function ChannelSidebar() {
  // 👇 LẤY THÊM i18n ĐỂ CHUYỂN NGÔN NGỮ 👇
  const { t, i18n } = useTranslation();
  
  // 👇 LẤY THÊM setShowAuthModal ĐỂ MỞ BẢNG ĐĂNG NHẬP 👇
  const { activeServerId, activeUniversityId, activeChannelId, setActiveChannelId, setActiveChannelName, pinnedServers, togglePinServer, setShowAuthModal } = useApp() as any;

  const { user, isLoaded } = useUser();
  const isLoggedIn = isLoaded && user;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'channel' | 'category'>('channel');
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);

  // 👇 STATE MENU NGÔN NGỮ KHI CHƯA ĐĂNG NHẬP 👇
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [showReportServerModal, setShowReportServerModal] = useState(false);
  const [reportStep, setReportStep] = useState(1);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const universities = useQuery(api.university.getUniversities);
  const myServers = useQuery(api.university.getMyServers);
  const currentUser = useQuery(api.users.current);
  const leaveServer = useMutation(api.university.leaveServer);
  const deleteChannel = useMutation(api.university.deleteChannel);

  const reportServerToAdmin = useMutation((api as any).messages.reportServerToAdmin);

  const channelsData = useQuery(api.university.getChannels, {
    universityId: activeUniversityId ? (activeUniversityId as Id<"universities">) : undefined,
    serverId: activeServerId ? (activeServerId as Id<"servers">) : undefined
  });

  const hiddenChannels = useQuery((api as any).university.getHiddenChannelIds, activeServerId ? { serverId: activeServerId } : "skip") || [];

  useEffect(() => {
    if (channelsData?.channels && channelsData.channels.length > 0) {
      const isChannelValid = channelsData.channels.some(c => c._id === activeChannelId);
      if (!activeChannelId || !isChannelValid) {
        const generalChannel = channelsData.channels.find(c => c.name === 'đại-sảnh');
        if (generalChannel) {
          setActiveChannelId(generalChannel._id);
          setActiveChannelName(generalChannel.name);
        } else {
          setActiveChannelId(channelsData.channels[0]._id);
          setActiveChannelName(channelsData.channels[0].name);
        }
      }
    }
  }, [channelsData?.channels, activeServerId, activeUniversityId]);

  if (!activeUniversityId && !activeServerId) return null;
  if (!channelsData) return <aside className="w-60 bg-[#f2f3f5] flex flex-col border-r border-gray-200"><div className="flex-1 flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div></div></aside>;

  const { channels, groups } = channelsData;
  const visibleChannels = channels.filter(c => !hiddenChannels.includes(c._id));
  const currentChannelsCount = channels.length + groups.length;
  const isUniversity = !!activeUniversityId;
  const currentWorkspace = isUniversity ? universities?.find(u => u._id === activeUniversityId) : myServers?.find(s => s._id === activeServerId);
  const isOwner = activeServerId && currentWorkspace && ('creatorId' in currentWorkspace) && currentWorkspace.creatorId === currentUser?._id;

  const stones = (currentWorkspace && 'totalStones' in currentWorkspace) 
  ? (currentWorkspace.totalStones as number) 
  : 0;
  let serverLevel = 0;
  for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (stones >= LEVEL_REQUIREMENTS[i].totalStones) { serverLevel = LEVEL_REQUIREMENTS[i].level; break; }
  }

  const isPinned = pinnedServers?.includes(activeServerId);
  const toggleGroup = (groupId: string) => setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const handleLeaveServer = async () => {
    if (isOwner) return alert(t('alerts.owner_cant_leave'));
    if (window.confirm(t('alerts.leave_server_desc', { name: currentWorkspace?.name }))) {
      try {
        await leaveServer({ serverId: activeServerId as Id<"servers"> });
        window.location.reload();
      } catch (e: any) { alert(t('common.error') + ": " + e.message); }
    }
  };

  const handleOpenCreateCategory = () => { setCreateType('category'); setCreateParentId(undefined); setIsCreateModalOpen(true); };
  const handleOpenCreateChannel = (categoryId: string) => { setCreateType('channel'); setCreateParentId(categoryId); setIsCreateModalOpen(true); };

  const handleDeleteChannel = async (id: string, isCategory: boolean, name: string) => {
    const typeStr = isCategory ? t('common.category') : t('common.channel');
    const msg = `${t('alerts.option_title', { type: typeStr })}\n${t('alerts.option_desc', { name })}`;
    if (window.confirm(msg)) {
      try {
        await deleteChannel({ channelId: id as Id<"channels"> });
        if (activeChannelId === id || isCategory) { setActiveChannelId(''); setActiveChannelName(''); }
      } catch (e: any) { alert(t('common.error') + ": " + e.message); }
    }
  };

  const handleSubmitServerReport = async () => {
    if (!activeServerId) return;
    setIsReporting(true);
    try {
      await reportServerToAdmin({
        serverId: activeServerId,
        targets: selectedTargets,
        reason: reportReason,
        customReason: customReason
      });
      alert(t('report.success'));
      setShowReportServerModal(false);
      setReportStep(1);
      setSelectedTargets([]);
      setReportReason('');
      setCustomReason('');
    } catch (error: any) {
      alert(t('common.error') + ": " + error.message);
    } finally {
      setIsReporting(false);
    }
  };

  const TARGET_OPTIONS = ['target_avatar', 'target_name', 'target_channels', 'target_purpose'];
  const REASON_OPTIONS = ['reason_spam', 'reason_harassment', 'reason_inappropriate', 'reason_adult', 'reason_other'];

  return (
    <aside className="w-60 bg-[#f2f3f5] flex flex-col border-r border-gray-200 shadow-[-4px_0_15px_rgba(0,0,0,0.02)_inset] relative z-20">

      <div className="relative flex items-center justify-between h-14 px-3 border-b border-gray-200 shadow-sm bg-white">
        {isUniversity ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 font-bold text-[15px] py-1.5 px-2 text-left text-gray-800 cursor-default">
            <span className="truncate">{currentWorkspace?.name || t('server.choose_workspace')}</span>
          </div>
        ) : (
          <button onClick={() => setShowServerMenu(!showServerMenu)} className="flex items-center gap-1.5 flex-1 min-w-0 font-bold text-[15px] hover:bg-gray-50 py-1.5 px-2 rounded-md transition-colors text-left">
            <span className="truncate">{currentWorkspace?.name || t('server.choose_workspace')}</span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
          </button>
        )}

        {isOwner && (
          <div className="flex items-center shrink-0 ml-1">
            <button onClick={handleOpenCreateCategory} className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-md hover:bg-gray-100" title={t('channel.create_title', { type: t('common.category') })}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            </button>
            <button onClick={() => setShowServerSettings(true)} className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-md hover:bg-gray-100" title={t('server.settings')}>
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}

        {showServerMenu && !isUniversity && (
          <>
            <div className="fixed inset-0 z-[40]" onClick={() => setShowServerMenu(false)}></div>
            <div className="absolute top-14 left-2 w-64 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-gray-100 z-[50] py-2 animate-in fade-in slide-in-from-top-2">

              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                  {currentWorkspace?.icon ? <img loading="lazy"src={currentWorkspace.icon} alt="icon" className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500 text-lg">{currentWorkspace?.name?.charAt(0)}</span>}
                </div>
                <span className="font-bold text-[15px] text-gray-900 truncate flex-1">{currentWorkspace?.name}</span>
              </div>
              <div className="h-px bg-gray-100 my-1"></div>

              <div className="px-4 py-2 text-[14px] font-bold text-gray-800">{t('menu.reached_level', { level: serverLevel })}</div>

              <button onClick={() => { setShowServerMenu(false); setShowUpgradeModal(true); }} className="w-full flex items-center px-4 py-3 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <TrendingUp className="w-5 h-5 mr-3 text-pink-500" /> {t('menu.upgrade_server')}
              </button>

              <button onClick={() => { setShowServerMenu(false); togglePinServer(activeServerId); }} className="w-full flex items-center px-4 py-3 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Pin className={`w-5 h-5 mr-3 ${isPinned ? 'text-blue-500' : 'text-gray-500'}`} /> {isPinned ? t('alerts.unpin') : t('menu.pin_server')}
              </button>

              <button onClick={() => { setShowServerMenu(false); setShowBrowseModal(true); }} className="w-full flex items-center px-4 py-3 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <List className="w-5 h-5 mr-3 text-gray-500" /> {t('menu.browse_channels')}
              </button>

              <div className="h-px bg-gray-100 my-1"></div>

              <button onClick={() => { setShowServerMenu(false); setShowReportServerModal(true); }} className="w-full flex items-center px-4 py-3 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors">
                <Flag className="w-5 h-5 mr-3 text-red-500" /> {t('menu.report_server')}
              </button>

              <div className="h-px bg-gray-100 my-1"></div>

              <button onClick={() => { setShowServerMenu(false); handleLeaveServer(); }} className="w-full flex items-center px-4 py-3 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-5 h-5 mr-3 text-red-500" /> {t('menu.leave_server')}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hidden-scrollbar py-3 px-2 space-y-[2px]">
        {visibleChannels.filter((c: any) => !c.parentId).map((channel: any) => {
          const isActive = activeChannelId === channel._id;
          return (
            <div key={channel._id} className={`w-full flex items-center justify-between px-2 py-[6px] rounded-md transition-colors group/channel ${isActive ? 'bg-[#e3e5e8] text-gray-900' : 'hover:bg-[#e3e5e8]/50'}`}>
              <button onClick={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} className={`flex items-center flex-1 text-left min-w-0 ${isActive ? 'font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
                <svg className="w-5 h-5 opacity-60 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                <span className="text-[15px] truncate flex-1">{channel.name}</span>
                {(channel as any).isAnonymous && <span className="ml-1 text-xs shrink-0" title={t('common.anonymous')}>🎭</span>}
              </button>
              {isOwner && channel.name !== 'đại-sảnh' && (
                <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel._id, false, channel.name); }} className="opacity-0 group-hover/channel:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 shrink-0" title={t('common.delete')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          )
        })}

        {groups.map(group => {
          const isCollapsed = collapsedGroups[group._id];
          const childChannels = visibleChannels.filter((c: any) => c.parentId === group._id);
          if (childChannels.length === 0) return null;

          return (
            <div key={group._id} className="pt-3">
              <div className="flex items-center justify-between px-1 mb-1 group/category">
                <button onClick={() => toggleGroup(group._id)} className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors flex-1 text-left min-w-0">
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span className="truncate">{group.name}</span>
                </button>
                {isOwner && (
                  <div className="opacity-0 group-hover/category:opacity-100 flex items-center transition-opacity shrink-0">
                    <button onClick={() => handleOpenCreateChannel(group._id)} className="text-gray-400 hover:text-gray-900 p-0.5" title={t('common.add')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(group._id, true, group.name); }} className="text-gray-400 hover:text-red-500 p-0.5 ml-1" title={t('common.delete')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="space-y-[2px]">
                  {childChannels.map((channel: any) => {
                    const isActive = activeChannelId === channel._id;
                    return (
                      <div key={channel._id} className={`w-full flex items-center justify-between px-2 py-[6px] rounded-md transition-colors group/channel ${isActive ? 'bg-[#e3e5e8] text-gray-900' : 'hover:bg-[#e3e5e8]/50'}`}>
                        <button onClick={() => { setActiveChannelId(channel._id); setActiveChannelName(channel.name); }} className={`flex items-center flex-1 text-left min-w-0 ${isActive ? 'font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
                          <svg className="w-5 h-5 opacity-60 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                          <span className="text-[15px] truncate flex-1">{channel.name}</span>
                          {(channel as any).isAnonymous && <span className="ml-1 text-xs shrink-0" title={t('common.anonymous')}>🎭</span>}
                        </button>
                        {isOwner && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel._id, false, channel.name); }} className="opacity-0 group-hover/channel:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 shrink-0" title={t('common.delete')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* =====================================================================
          FOOTER: ĐÃ ĐƯỢC THIẾT KẾ LẠI CHO CẢ 2 TRẠNG THÁI (LOGIN / LOGOUT)
          ===================================================================== */}
      <div className="h-[60px] bg-[#ebecee] flex items-center justify-between px-3 py-1 shrink-0 border-t border-gray-200 relative">
        {isLoggedIn ? (
          <>
            {/* TRẠNG THÁI ĐÃ ĐĂNG NHẬP: HIỆN HỒ SƠ & CÀI ĐẶT */}
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 flex-1 hover:bg-gray-300/50 p-1.5 rounded-md transition-colors min-w-0 text-left">
              <div className="relative shrink-0">
                <img loading="lazy" src={user?.imageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-gray-300" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#ebecee]"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-gray-900 truncate">{currentUser?.first_name || user?.username || t('settings.default_user')}</span>
                <span className="text-[11px] text-gray-500 truncate">@{user?.username}</span>
              </div>
            </button>

            <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-300/50 hover:text-gray-900 rounded-md transition-colors shrink-0 ml-1" title={t('settings.title')}>
              <Settings className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            {/* TRẠNG THÁI CHƯA ĐĂNG NHẬP: HIỆN NÚT LOGIN XANH LÁ & CHỌN NGÔN NGỮ */}
            <button onClick={() => setShowAuthModal(true)} className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[14px] py-2 px-3 rounded-lg transition-colors text-center shadow-sm">
              Đăng nhập
            </button>

            <div className="relative shrink-0 ml-2">
              <button onClick={() => setShowLangMenu(!showLangMenu)} className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-300/50 hover:text-gray-900 rounded-lg transition-colors">
                <Globe className="w-5 h-5" />
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setShowLangMenu(false)}></div>
                  <div className="absolute bottom-full right-0 mb-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-[50] animate-in fade-in zoom-in-95">
                    <button onClick={() => { i18n.changeLanguage('vi'); setShowLangMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors">Tiếng Việt 🇻🇳</button>
                    <button onClick={() => { i18n.changeLanguage('en'); setShowLangMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors">English 🇺🇸</button>
                    <button onClick={() => { i18n.changeLanguage('zh'); setShowLangMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors">中文 🇨🇳</button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {/* 👇 MODAL USER PROFILE SẼ BẬT LÊN Ở ĐÂY NẾU showProfile LÀ TRUE 👇 */}
      {showProfile && currentUser && <UserProfileModal onClose={() => setShowProfile(false)} targetUserId={currentUser._id} />}
      
      {showServerSettings && currentWorkspace && <ServerSettingsModal onClose={() => setShowServerSettings(false)} workspace={currentWorkspace} />}
      {showModeration && currentWorkspace && <ModerationModal serverId={currentWorkspace._id} onClose={() => setShowModeration(false)} />}
      {activeServerId && <CreateChannelModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} serverId={activeServerId} type={createType} parentId={createParentId} />}
      {showUpgradeModal && currentWorkspace && <UpgradeServerModal channelCount={currentChannelsCount} workspace={currentWorkspace} onClose={() => setShowUpgradeModal(false)} />}
      {showBrowseModal && currentWorkspace && <BrowseChannelsModal serverId={currentWorkspace._id} channels={channels} groups={groups} onClose={() => setShowBrowseModal(false)} />}

      {/* MODAL 2 BƯỚC BÁO CÁO MÁY CHỦ */}
      {showReportServerModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => { setShowReportServerModal(false); setReportStep(1); }}>
          <div className="bg-white rounded-2xl w-full max-w-[450px] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-[20px] font-extrabold text-gray-900 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-red-500" />
                 {t('report.step1_title')}
               </h2>
               <button onClick={() => { setShowReportServerModal(false); setReportStep(1); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            {reportStep === 1 ? (
               <>
                 <p className="text-sm text-gray-500 mb-4">{t('report.step1_desc')}</p>
                 <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto hidden-scrollbar">
                   {TARGET_OPTIONS.map(target => (
                     <label key={target} className={`flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border transition-colors ${selectedTargets.includes(target) ? 'border-[#5865F2] bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                       <input
                          type="checkbox"
                          checked={selectedTargets.includes(target)}
                          onChange={(e) => {
                             if (e.target.checked) setSelectedTargets([...selectedTargets, target]);
                             else setSelectedTargets(selectedTargets.filter(t => t !== target));
                          }}
                          className="w-4 h-4 text-[#5865F2] cursor-pointer rounded"
                       />
                       <span className="text-[14px] font-medium text-gray-800">{t(`report.${target}`)}</span>
                     </label>
                   ))}
                 </div>
                 <button onClick={() => setReportStep(2)} disabled={selectedTargets.length === 0} className="w-full py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold disabled:bg-indigo-300 text-[14px] transition-colors">
                   {t('common.next')}
                 </button>
               </>
            ) : (
               <>
                 <p className="text-sm text-gray-500 mb-4 border-b border-gray-100 pb-3">{t('alerts.report_thanks')}</p>
                 <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto hidden-scrollbar">
                   {REASON_OPTIONS.map(r => (
                     <label key={r} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                       <input type="radio" name="report_reason" value={r} checked={reportReason === r} onChange={(e) => setReportReason(e.target.value)} className="w-4 h-4 text-[#5865F2] cursor-pointer" />
                       <span className="text-[14px] font-medium text-gray-800">{t(`report.${r}`)}</span>
                     </label>
                   ))}
                   {reportReason === 'reason_other' && <div className="mt-3"><textarea placeholder={t('report.custom_reason_placeholder')} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-[14px] outline-none min-h-[80px]" onChange={e => setCustomReason(e.target.value)} autoFocus /></div>}
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setReportStep(1)} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors text-[14px]">{t('common.back')}</button>
                    <button onClick={handleSubmitServerReport} disabled={!reportReason || (reportReason === 'reason_other' && !customReason.trim()) || isReporting} className="flex-1 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold disabled:bg-indigo-300 text-[14px] flex justify-center items-center">
                       {isReporting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : t('common.confirm')}
                    </button>
                 </div>
               </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}