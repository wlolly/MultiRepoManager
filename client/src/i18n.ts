import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// 定义多语言翻译资源
const resources = {
  zh: {
    common: {
      app: {
        name: "ELEMENT-5 仓储管理系统",
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
      // 使用扁平结构的翻译键
      languageDistribution_title: "语言分布",
      languageDistribution_noData: "暂无语言分布数据",
      recentActivity_title: "最近活动",
      recentActivity_noData: "暂无活动数据",
      time: {
        justNow: "刚刚",
        minutesAgo: "{{value}}分钟前",
        hoursAgo: "{{value}}小时前",
        yesterday: "昨天",
        daysAgo: "{{value}}天前"
      },
      in: "在",
      dashboard: {
        welcome: "欢迎使用 ELEMENT-5 系统",
        statsTitle: "系统统计",
        repositoriesCount: "仓库总数",
        usersCount: "用户总数",
        languagesCount: "语言数量",
        commitsCount: "最近提交",
        createRepository: "创建仓库",
        filterByLanguage: "按语言筛选",
        filterByUser: "按用户筛选",
        allLanguages: "所有语言",
        allUsers: "所有用户",
        listView: "列表视图",
        gridView: "网格视图"
      },
      warehouse: {
        products: "商品管理",
        warehouses: "仓库管理",
        inbound: "入库单",
        outbound: "出库单",
        inventory: "库存查询",
        ecommerce: "电商平台",
        barcode: "条码扫描",
        settings: "系统设置"
      }
    }
  },
  en: {
    common: {
      app: {
        name: "ELEMENT-5 Warehouse Management System",
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
      },
      // 使用扁平结构的翻译键
      languageDistribution_title: "Language Distribution",
      languageDistribution_noData: "No language distribution data",
      recentActivity_title: "Recent Activity",
      recentActivity_noData: "No recent activity",
      time: {
        justNow: "just now",
        minutesAgo: "{{value}} minutes ago",
        hoursAgo: "{{value}} hours ago",
        yesterday: "yesterday",
        daysAgo: "{{value}} days ago"
      },
      in: "in",
      dashboard: {
        welcome: "Welcome to ELEMENT-5 System",
        statsTitle: "System Statistics",
        repositoriesCount: "Total Repositories",
        usersCount: "Total Users",
        languagesCount: "Languages Count",
        commitsCount: "Recent Commits",
        createRepository: "Create Repository",
        filterByLanguage: "Filter by Language",
        filterByUser: "Filter by User",
        allLanguages: "All Languages",
        allUsers: "All Users",
        listView: "List View",
        gridView: "Grid View"
      },
      warehouse: {
        products: "Products",
        warehouses: "Warehouses",
        inbound: "Inbound Orders",
        outbound: "Outbound Orders",
        inventory: "Inventory",
        ecommerce: "E-commerce Platforms",
        barcode: "Barcode Scanner",
        settings: "System Settings"
      }
    }
  },
  ru: {
    common: {
      app: {
        name: "ELEMENT-5 Система управления складом",
        version: "Версия 1.0.0"
      },
      sidebar: {
        navigation: "Навигация",
        recentActivity: "Недавняя активность",
        noActivity: "Нет активности",
        newRepository: "Новый репозиторий",
        navigation_items: {
          dashboard: "Панель управления",
          myRepositories: "Мои репозитории",
          teamRepositories: "Командные репозитории",
          usersAndTeams: "Пользователи и команды",
          settings: "Настройки"
        }
      },
      header: {
        searchPlaceholder: "Поиск",
        language: {
          title: "Сменить язык",
          zh: "Китайский",
          en: "Английский",
          ru: "Русский",
          kk: "Казахский",
          uz: "Узбекский"
        },
        account: {
          myAccount: "Мой аккаунт",
          profile: "Профиль",
          settings: "Настройки",
          logout: "Выйти"
        }
      },
      languageDistribution_title: "Распределение языков",
      languageDistribution_noData: "Нет данных о распределении языков",
      recentActivity_title: "Недавняя активность",
      recentActivity_noData: "Нет недавней активности",
      time: {
        justNow: "только что",
        minutesAgo: "{{value}} минут назад",
        hoursAgo: "{{value}} часов назад",
        yesterday: "вчера",
        daysAgo: "{{value}} дней назад"
      },
      in: "в",
      dashboard: {
        welcome: "Добро пожаловать в систему ELEMENT-5",
        statsTitle: "Статистика системы",
        repositoriesCount: "Всего репозиториев",
        usersCount: "Всего пользователей",
        languagesCount: "Количество языков",
        commitsCount: "Недавние коммиты",
        createRepository: "Создать репозиторий",
        filterByLanguage: "Фильтр по языку",
        filterByUser: "Фильтр по пользователю",
        allLanguages: "Все языки",
        allUsers: "Все пользователи",
        listView: "Список",
        gridView: "Сетка"
      },
      warehouse: {
        products: "Товары",
        warehouses: "Склады",
        inbound: "Приходные ордера",
        outbound: "Расходные ордера",
        inventory: "Инвентаризация",
        ecommerce: "Платформы электронной коммерции",
        barcode: "Сканер штрих-кодов",
        settings: "Настройки системы"
      }
    }
  },
  kk: {
    common: {
      app: {
        name: "ELEMENT-5 Қойма басқару жүйесі",
        version: "Нұсқасы 1.0.0"
      },
      header: {
        language: {
          title: "Тілді ауыстыру",
          zh: "Қытай",
          en: "Ағылшын",
          ru: "Орыс",
          kk: "Қазақ",
          uz: "Өзбек"
        }
      },
      time: {
        justNow: "дәл қазір",
        minutesAgo: "{{value}} минут бұрын",
        hoursAgo: "{{value}} сағат бұрын",
        yesterday: "кеше",
        daysAgo: "{{value}} күн бұрын"
      }
    }
  },
  uz: {
    common: {
      app: {
        name: "ELEMENT-5 Ombor boshqaruv tizimi",
        version: "Versiya 1.0.0"
      },
      header: {
        language: {
          title: "Tilni o'zgartirish",
          zh: "Xitoy",
          en: "Ingliz",
          ru: "Rus",
          kk: "Qozoq",
          uz: "O'zbek"
        }
      },
      time: {
        justNow: "hozirgina",
        minutesAgo: "{{value}} daqiqa oldin",
        hoursAgo: "{{value}} soat oldin",
        yesterday: "kecha",
        daysAgo: "{{value}} kun oldin"
      }
    }
  }
};

// 初始化 i18n 配置
i18n
  .use(initReactI18next)
  .use(HttpBackend)
  .init({
    resources, // 内部资源仅作为回退
    lng: 'zh', // 默认使用中文
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    defaultNS: 'common',
    react: {
      useSuspense: false
    },
    backend: {
      // 使用完整的URL路径确保正确加载语言文件
      loadPath: `${window.location.origin}/locales/{{lng}}/{{ns}}.json`,
      requestOptions: {
        cache: 'no-cache',  // 防止缓存问题
        mode: 'cors',
        credentials: 'same-origin'
      },
      crossDomain: false
    },
    ns: ['common'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    debug: true // 在控制台输出调试信息
  });

// 获取支持的语言列表
export const supportedLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'uz', name: 'O\'zbekcha' }
];

// 创建一个设置语言的函数，可以在应用中调用
export const changeLanguage = (langCode: string) => {
  if (!['zh', 'en', 'ru', 'kk', 'uz'].includes(langCode)) {
    langCode = 'zh'; // 如果不是支持的语言，默认使用中文
  }
  
  localStorage.setItem('i18nextLng', langCode);
  
  // 强制重新加载 HTTP backend 中的资源
  i18n.reloadResources([langCode]).then(() => {
    i18n.changeLanguage(langCode);
    
    let message = '';
    switch(langCode) {
      case 'zh':
        message = '语言已设置为中文';
        break;
      case 'en':
        message = 'Language set to English';
        break;
      case 'ru':
        message = 'Язык установлен на русский';
        break;
      case 'kk':
        message = 'Тіл қазақ тіліне орнатылды';
        break;
      case 'uz':
        message = 'Til o\'zbek tiliga o\'rnatildi';
        break;
    }
    
    console.log(message, langCode);
  });
  
  return langCode;
};

// 兼容旧代码的函数
export const forceChineseLanguage = () => {
  return changeLanguage('zh');
};

// 初始化加载所有语言资源以确保它们可用
i18n.reloadResources(['zh', 'en', 'ru', 'kk', 'uz']).then(() => {
  console.log("所有语言资源已加载");
  
  // 读取之前保存的语言设置，如果没有则默认使用中文
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && ['zh', 'en', 'ru', 'kk', 'uz'].includes(savedLanguage)) {
    i18n.changeLanguage(savedLanguage);
    console.log(`已从本地存储加载语言: ${savedLanguage}`);
  } else {
    i18n.changeLanguage('zh');
    localStorage.setItem('i18nextLng', 'zh');
    console.log('默认使用中文');
  }
});

export default i18n;