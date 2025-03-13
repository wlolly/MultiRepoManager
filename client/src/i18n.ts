import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 直接定义中文翻译资源
const resources = {
  zh: {
    common: {
      app: {
        name: "仓储管理系统",
        version: "版本 1.0.0"
      },
      sidebar: {
        navigation: "导航",
        recentActivity: "最近活动",
        noActivity: "暂无活动",
        newRepository: "新建仓库",
        navigation_items: {
          dashboard: "仪表盘",
          myRepositories: "我的仓库",
          teamRepositories: "团队仓库",
          usersAndTeams: "用户和团队",
          settings: "系统设置"
        }
      },
      header: {
        searchPlaceholder: "搜索",
        language: {
          title: "切换语言",
          zh: "中文",
          en: "英文",
          ru: "俄文",
          kk: "哈萨克文",
          uz: "乌兹别克文"
        },
        account: {
          myAccount: "我的账号",
          profile: "个人资料",
          settings: "设置",
          logout: "退出登录"
        }
      },
      recentActivity: {
        title: "最近活动",
        noData: "暂无活动数据"
      },
      recentActivity_title: "最近活动",
      recentActivity_noData: "暂无活动数据",
      languageDistribution: {
        title: "语言分布",
        noData: "暂无语言分布数据"
      },
      languageDistribution_title: "语言分布",
      languageDistribution_noData: "暂无语言分布数据",
      time: {
        justNow: "刚刚",
        minutesAgo: "{{value}}分钟前",
        hoursAgo: "{{value}}小时前",
        yesterday: "昨天",
        daysAgo: "{{value}}天前"
      },
      in: "在"
    }
  },
  en: {
    common: {
      app: {
        name: "Warehouse Management System",
        version: "Version 1.0.0"
      },
      sidebar: {
        navigation: "Navigation",
        recentActivity: "Recent Activity",
        noActivity: "No Activity",
        newRepository: "New Repository",
        navigation_items: {
          dashboard: "Dashboard",
          myRepositories: "My Repositories",
          teamRepositories: "Team Repositories",
          usersAndTeams: "Users & Teams",
          settings: "Settings"
        }
      },
      header: {
        searchPlaceholder: "Search",
        language: {
          title: "Switch Language",
          zh: "Chinese",
          en: "English",
          ru: "Russian",
          kk: "Kazakh",
          uz: "Uzbek"
        },
        account: {
          myAccount: "My Account",
          profile: "Profile",
          settings: "Settings",
          logout: "Logout"
        }
      }
    }
  }
};

// 强制将当前系统时间格式信息设置为中文
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    defaultNS: 'common',
    react: {
      useSuspense: false
    }
  });

// 创建一个强制设置语言的函数，可以在应用中调用
export const forceChineseLanguage = () => {
  localStorage.setItem('i18nextLng', 'zh');
  i18n.changeLanguage('zh');
  console.log('已将语言强制切换为中文', i18n.language);
};

// 强制设置为中文
forceChineseLanguage();

export default i18n;