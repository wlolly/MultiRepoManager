import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 定义多语言翻译资源
const resources = {
  zh: {
    common: {
      general: {
        loading: "加载中...",
        cancel: "取消",
        description: "描述"
      },
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
      repositories: {
        title: "仓库",
        my: "我的仓库",
        team: "团队仓库",
        teamDescription: "与您的团队在共享仓库上协作",
        teamSelectPrompt: "请选择一个团队以查看其仓库",
        selectTeam: "选择团队",
        newRepository: "新建仓库",
        createNewRepository: "创建新仓库",
        repositoryInformation: "仓库信息",
        enterRepositoryDetails: "输入您的新仓库详细信息",
        repositoryName: "仓库名称",
        chooseUniqueName: "为您的仓库选择一个唯一名称。仅使用字母、数字、连字符和下划线。",
        initializeRepository: "初始化仓库",
        addReadme: "添加README文件",
        createReadme: "创建README来描述您的项目并提供重要信息。",
        addGitignore: "添加.gitignore文件",
        addGitignoreDescription: "添加.gitignore文件以排除构建产物和其他常见文件。",
        empty: "暂无仓库",
        createFirst: "创建第一个仓库",
        search: "搜索仓库",
        all_languages: "所有语言",
        all_users: "所有用户",
        all_visibility: "所有可见性",
        recent: "最近仓库",
        recentDescription: "您最近更新的仓库",
        notFound: "未找到仓库",
        noTeams: "暂无可用团队",
        noDescription: "无描述"
      },
      users: {
        title: "用户与团队",
        subtitle: "管理用户和团队访问权限",
        users: "用户",
        teams: "团队",
        user: "用户",
        systemUsers: "系统用户",
        username: "用户名",
        fullName: "全名",
        created: "创建时间",
        actions: "操作",
        noUsersFound: "未找到用户",
        addUser: "添加用户",
        addNewUser: "添加新用户",
        createNewUserDesc: "在系统中创建新用户账户。",
        password: "密码",
        createUser: "创建用户",
        createTeam: "创建团队",
        createTeamDesc: "创建新团队以共同协作处理仓库。",
        teamName: "团队名称",
        manageTeam: "管理团队"
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
      },
      settings: {
        title: "系统设置",
        subtitle: "管理您的账户设置和偏好",
        tabs: {
          account: "账户信息",
          security: "安全设置",
          notifications: "通知设置",
          appearance: "外观设置"
        },
        account: {
          title: "账户信息设置",
          description: "更新您的账户信息和个人资料",
          avatar: "头像",
          avatarUrl: "头像图片URL",
          fullName: "姓名",
          username: "用户名",
          email: "电子邮箱",
          saveButton: "保存更改"
        },
        security: {
          title: "安全设置",
          description: "管理您的密码和安全偏好",
          currentPassword: "当前密码",
          newPassword: "新密码",
          confirmPassword: "确认新密码",
          changePasswordButton: "修改密码",
          twoFactorAuth: "双因素认证",
          twoFactorDescription: "启用双因素认证为您的账户添加额外的安全层级",
          enableTwoFactorButton: "启用双因素认证"
        },
        notifications: {
          title: "通知偏好设置",
          description: "管理如何接收通知和提醒",
          emailNotifications: "电子邮件通知",
          emailNotificationsDescription: "接收重要更新的电子邮件通知",
          repositoryActivity: "仓库活动",
          repositoryActivityDescription: "接收关于提交、分支和合并请求的通知",
          teamActivity: "团队活动",
          teamActivityDescription: "关于团队成员变更的通知",
          securityAlerts: "安全提醒",
          securityAlertsDescription: "重要安全更新和漏洞提醒",
          saveButton: "保存偏好"
        },
        appearance: {
          title: "外观设置",
          description: "自定义ELEMENT-5系统的外观",
          darkMode: "深色模式",
          darkModeDescription: "使用深色主题",
          language: "系统语言",
          selectLanguage: "选择语言",
          saveButton: "保存偏好"
        }
      }
    }
  },
  en: {
    common: {
      general: {
        loading: "Loading...",
        cancel: "Cancel",
        description: "Description"
      },
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
      repositories: {
        title: "Repositories",
        my: "My Repositories",
        team: "Team Repositories",
        newRepository: "New Repository",
        createNewRepository: "Create New Repository",
        repositoryInformation: "Repository Information",
        enterRepositoryDetails: "Enter the details for your new repository",
        repositoryName: "Repository Name",
        chooseUniqueName: "Choose a unique name for your repository. Use only letters, numbers, hyphens, and underscores.",
        initializeRepository: "Initialize Repository With",
        addReadme: "Add a README file",
        createReadme: "Create a README to describe your project and give important information.",
        addGitignore: "Add .gitignore file",
        addGitignoreDescription: "Add a .gitignore file to exclude build artifacts and other common files.",
        empty: "No repositories",
        createFirst: "Create your first repository",
        search: "Search repositories",
        all_languages: "All Languages",
        all_users: "All Users",
        all_visibility: "All Visibility",
        recent: "Recent Repositories",
        recentDescription: "Your recently updated repositories",
        notFound: "Repository not found",
        noTeams: "No teams available",
        noDescription: "No description",
        selectTeam: "Select a Team",
        teamDescription: "Collaborate with your team on shared repositories",
        teamSelectPrompt: "Please select a team to view its repositories"
      },
      users: {
        title: "Users & Teams",
        subtitle: "Manage users and team access",
        users: "Users",
        teams: "Teams",
        user: "User",
        systemUsers: "System Users",
        username: "Username",
        fullName: "Full Name",
        created: "Created",
        actions: "Actions",
        noUsersFound: "No users found",
        addUser: "Add User",
        addNewUser: "Add New User",
        createNewUserDesc: "Create a new user account in the system.",
        password: "Password",
        createUser: "Create User",
        createTeam: "Create Team",
        createTeamDesc: "Create a new team to collaborate on repositories.",
        teamName: "Team Name",
        manageTeam: "Manage Team"
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
      },
      settings: {
        title: "System Settings",
        subtitle: "Manage your account settings and preferences",
        tabs: {
          account: "Account Info",
          security: "Security",
          notifications: "Notifications",
          appearance: "Appearance"
        },
        account: {
          title: "Account Information",
          description: "Update your account and profile information",
          avatar: "Avatar",
          avatarUrl: "Avatar Image URL",
          fullName: "Full Name",
          username: "Username",
          email: "Email",
          saveButton: "Save Changes"
        },
        security: {
          title: "Security Settings",
          description: "Manage your password and security preferences",
          currentPassword: "Current Password",
          newPassword: "New Password",
          confirmPassword: "Confirm New Password",
          changePasswordButton: "Change Password",
          twoFactorAuth: "Two-Factor Authentication",
          twoFactorDescription: "Enable two-factor authentication to add an extra layer of security to your account.",
          enableTwoFactorButton: "Enable Two-Factor Authentication"
        },
        notifications: {
          title: "Notification Preferences",
          description: "Manage how you receive notifications and alerts",
          emailNotifications: "Email Notifications",
          emailNotificationsDescription: "Receive email notifications for important updates",
          repositoryActivity: "Repository Activity",
          repositoryActivityDescription: "Notifications about commits, branches, and pull requests",
          teamActivity: "Team Activity",
          teamActivityDescription: "Notifications about team member changes",
          securityAlerts: "Security Alerts",
          securityAlertsDescription: "Important security updates and vulnerability alerts",
          saveButton: "Save Preferences"
        },
        appearance: {
          title: "Appearance Settings",
          description: "Customize the appearance of the ELEMENT-5 system",
          darkMode: "Dark Mode",
          darkModeDescription: "Use dark theme",
          language: "System Language",
          selectLanguage: "Select Language",
          saveButton: "Save Preferences"
        }
      }
    }
  },
  ru: {
    common: {
      general: {
        loading: "Загрузка...",
        cancel: "Отмена",
        description: "Описание"
      },
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
      repositories: {
        title: "Репозитории",
        my: "Мои репозитории",
        team: "Командные репозитории",
        teamDescription: "Совместная работа с командой над общими репозиториями",
        newRepository: "Новый репозиторий",
        empty: "Нет репозиториев",
        createFirst: "Создайте свой первый репозиторий",
        search: "Поиск репозиториев",
        all_languages: "Все языки",
        all_users: "Все пользователи",
        all_visibility: "Вся видимость",
        recent: "Последние репозитории",
        recentDescription: "Ваши недавно обновленные репозитории",
        notFound: "Репозиторий не найден",
        noTeams: "Нет доступных команд",
        selectTeam: "Выберите команду",
        teamSelectPrompt: "Выберите команду для просмотра её репозиториев",
        noDescription: "Нет описания"
      },
      users: {
        title: "Пользователи и команды",
        subtitle: "Управление пользователями и доступом команд",
        users: "Пользователи",
        teams: "Команды",
        user: "Пользователь",
        systemUsers: "Системные пользователи",
        username: "Имя пользователя",
        fullName: "Полное имя",
        created: "Создан",
        actions: "Действия",
        noUsersFound: "Пользователи не найдены",
        addUser: "Добавить пользователя",
        addNewUser: "Добавить нового пользователя",
        createNewUserDesc: "Создать новую учетную запись пользователя в системе.",
        password: "Пароль",
        createUser: "Создать пользователя",
        createTeam: "Создать команду",
        createTeamDesc: "Создать новую команду для совместной работы над репозиториями.",
        teamName: "Название команды",
        manageTeam: "Управление командой"
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
      },
      settings: {
        title: "Настройки системы",
        subtitle: "Управление настройками и предпочтениями аккаунта",
        tabs: {
          account: "Информация аккаунта",
          security: "Безопасность",
          notifications: "Уведомления",
          appearance: "Внешний вид"
        },
        account: {
          title: "Информация аккаунта",
          description: "Обновите информацию вашего аккаунта и профиля",
          avatar: "Аватар",
          avatarUrl: "URL изображения аватара",
          fullName: "Полное имя",
          username: "Имя пользователя",
          email: "Электронная почта",
          saveButton: "Сохранить изменения"
        },
        security: {
          title: "Настройки безопасности",
          description: "Управление паролем и настройками безопасности",
          currentPassword: "Текущий пароль",
          newPassword: "Новый пароль",
          confirmPassword: "Подтвердите новый пароль",
          changePasswordButton: "Изменить пароль",
          twoFactorAuth: "Двухфакторная аутентификация",
          twoFactorDescription: "Включите двухфакторную аутентификацию для дополнительного уровня защиты вашего аккаунта",
          enableTwoFactorButton: "Включить двухфакторную аутентификацию"
        },
        notifications: {
          title: "Настройки уведомлений",
          description: "Управление способами получения уведомлений и оповещений",
          emailNotifications: "Уведомления по электронной почте",
          emailNotificationsDescription: "Получать уведомления по электронной почте о важных обновлениях",
          repositoryActivity: "Активность в репозиториях",
          repositoryActivityDescription: "Уведомления о коммитах, ветках и запросах на слияние",
          teamActivity: "Активность команды",
          teamActivityDescription: "Уведомления об изменениях в составе команды",
          securityAlerts: "Оповещения безопасности",
          securityAlertsDescription: "Важные обновления безопасности и оповещения об уязвимостях",
          saveButton: "Сохранить настройки"
        },
        appearance: {
          title: "Настройки внешнего вида",
          description: "Настройка внешнего вида системы ELEMENT-5",
          darkMode: "Темный режим",
          darkModeDescription: "Использовать темную тему",
          language: "Язык системы",
          selectLanguage: "Выберите язык",
          saveButton: "Сохранить настройки"
        }
      }
    }
  },
  kk: {
    common: {
      general: {
        loading: "Жүктелуде...",
        cancel: "Болдырмау",
        description: "Сипаттама"
      },
      app: {
        name: "ELEMENT-5 Қойма басқару жүйесі",
        version: "Нұсқасы 1.0.0"
      },
      sidebar: {
        navigation: "Навигация",
        recentActivity: "Соңғы белсенділік",
        noActivity: "Белсенділік жоқ",
        newRepository: "Жаңа репозиторий",
        navigation_items: {
          dashboard: "Басқару тақтасы",
          myRepositories: "Менің репозиторийлерім",
          teamRepositories: "Команда репозиторийлері",
          usersAndTeams: "Пайдаланушылар мен командалар",
          settings: "Параметрлер"
        }
      },
      header: {
        searchPlaceholder: "Іздеу",
        language: {
          title: "Тілді ауыстыру",
          zh: "Қытай",
          en: "Ағылшын",
          ru: "Орыс",
          kk: "Қазақ",
          uz: "Өзбек"
        },
        account: {
          myAccount: "Менің аккаунтым",
          profile: "Профиль",
          settings: "Параметрлер",
          logout: "Шығу"
        }
      },
      languageDistribution_title: "Тілдер таралуы",
      languageDistribution_noData: "Тілдер таралуы туралы деректер жоқ",
      recentActivity_title: "Соңғы белсенділік",
      recentActivity_noData: "Соңғы белсенділік жоқ",
      time: {
        justNow: "дәл қазір",
        minutesAgo: "{{value}} минут бұрын",
        hoursAgo: "{{value}} сағат бұрын",
        yesterday: "кеше",
        daysAgo: "{{value}} күн бұрын"
      },
      in: "ішінде",
      dashboard: {
        welcome: "ELEMENT-5 жүйесіне қош келдіңіз",
        statsTitle: "Жүйе статистикасы",
        repositoriesCount: "Барлық репозиторийлер",
        usersCount: "Барлық пайдаланушылар",
        languagesCount: "Тілдер саны",
        commitsCount: "Соңғы жазбалар",
        createRepository: "Репозиторий жасау",
        filterByLanguage: "Тіл бойынша сүзу",
        filterByUser: "Пайдаланушы бойынша сүзу",
        allLanguages: "Барлық тілдер",
        allUsers: "Барлық пайдаланушылар",
        listView: "Тізім көрінісі",
        gridView: "Торлы көрініс"
      },
      repositories: {
        title: "Репозиторийлер",
        my: "Менің репозиторийлерім",
        team: "Команда репозиторийлері",
        newRepository: "Жаңа репозиторий",
        empty: "Репозиторийлер жоқ",
        createFirst: "Алғашқы репозиторийді жасаңыз",
        search: "Репозиторийлерді іздеу",
        all_languages: "Барлық тілдер",
        all_users: "Барлық пайдаланушылар",
        all_visibility: "Барлық көрінушіліктер",
        recent: "Соңғы репозиторийлер",
        recentDescription: "Сіздің жақында жаңартылған репозиторийлеріңіз",
        notFound: "Репозиторий табылмады",
        noTeams: "Қолжетімді командалар жоқ",
        noDescription: "Сипаттама жоқ",
        selectTeam: "Команданы таңдаңыз",
        teamDescription: "Ортақ репозиторийлерде командаңызбен бірге жұмыс істеңіз",
        teamSelectPrompt: "Репозиторийлерін көру үшін команданы таңдаңыз"
      },
      users: {
        title: "Пайдаланушылар мен командалар",
        subtitle: "Пайдаланушылар мен команда рұқсаттарын басқару",
        users: "Пайдаланушылар",
        teams: "Командалар",
        user: "Пайдаланушы",
        systemUsers: "Жүйе пайдаланушылары",
        username: "Пайдаланушы аты",
        fullName: "Толық аты",
        created: "Құрылған",
        actions: "Әрекеттер",
        noUsersFound: "Пайдаланушылар табылмады",
        addUser: "Пайдаланушы қосу",
        addNewUser: "Жаңа пайдаланушы қосу",
        createNewUserDesc: "Жүйеде жаңа пайдаланушы тіркелгісін жасаңыз.",
        password: "Құпия сөз",
        createUser: "Пайдаланушы жасау",
        createTeam: "Команда құру",
        createTeamDesc: "Репозиторийлермен бірге жұмыс істеу үшін жаңа команда құрыңыз.",
        teamName: "Команда атауы",
        manageTeam: "Команданы басқару"
      },
      warehouse: {
        products: "Тауарлар",
        warehouses: "Қоймалар",
        inbound: "Кіріс тапсырыстары",
        outbound: "Шығыс тапсырыстары",
        inventory: "Түгендеу",
        ecommerce: "Электрондық коммерция платформалары",
        barcode: "Штрих-код сканері",
        settings: "Жүйе параметрлері"
      },
      settings: {
        title: "Жүйе параметрлері",
        subtitle: "Тіркелгі параметрлері мен таңдауларын басқару",
        tabs: {
          account: "Тіркелгі ақпараты",
          security: "Қауіпсіздік",
          notifications: "Хабарландырулар",
          appearance: "Сыртқы түрі"
        },
        account: {
          title: "Тіркелгі ақпараты",
          description: "Тіркелгі ақпаратыңыз бен профиліңізді жаңартыңыз",
          avatar: "Аватар",
          avatarUrl: "Аватар суретінің URL",
          fullName: "Толық аты",
          username: "Пайдаланушы аты",
          email: "Электрондық пошта",
          saveButton: "Өзгерістерді сақтау"
        },
        security: {
          title: "Қауіпсіздік параметрлері",
          description: "Құпия сөз бен қауіпсіздік параметрлерін басқару",
          currentPassword: "Ағымдағы құпия сөз",
          newPassword: "Жаңа құпия сөз",
          confirmPassword: "Жаңа құпия сөзді растаңыз",
          changePasswordButton: "Құпия сөзді өзгерту",
          twoFactorAuth: "Екі факторлы аутентификация",
          twoFactorDescription: "Тіркелгіңіздің қауіпсіздігін арттыру үшін екі факторлы аутентификацияны қосыңыз",
          enableTwoFactorButton: "Екі факторлы аутентификацияны қосу"
        },
        notifications: {
          title: "Хабарландыру параметрлері",
          description: "Хабарландыруларды қалай алатыныңызды басқару",
          emailNotifications: "Электрондық пошта хабарландырулары",
          emailNotificationsDescription: "Маңызды жаңартулар туралы электрондық пошта хабарландыруларын алу",
          repositoryActivity: "Репозиторий белсенділігі",
          repositoryActivityDescription: "Коммиттер, тармақтар және тартуға сұрауларды хабарландырулар",
          teamActivity: "Команда белсенділігі",
          teamActivityDescription: "Команда мүшелеріндегі өзгерістер туралы хабарландырулар",
          securityAlerts: "Қауіпсіздік ескертулері",
          securityAlertsDescription: "Маңызды қауіпсіздік жаңартулары мен осалдықтар туралы ескертулер",
          saveButton: "Параметрлерді сақтау"
        },
        appearance: {
          title: "Сыртқы түрі параметрлері",
          description: "ELEMENT-5 жүйесінің сыртқы түрін баптау",
          darkMode: "Қараңғы режим",
          darkModeDescription: "Қараңғы тақырыпты қолдану",
          language: "Жүйе тілі",
          selectLanguage: "Тілді таңдаңыз",
          saveButton: "Параметрлерді сақтау"
        }
      }
    }
  },
  uz: {
    common: {
      general: {
        loading: "Yuklanmoqda...",
        cancel: "Bekor qilish",
        description: "Tavsif"
      },
      app: {
        name: "ELEMENT-5 Ombor boshqaruv tizimi",
        version: "Versiya 1.0.0"
      },
      sidebar: {
        navigation: "Navigatsiya",
        recentActivity: "So'nggi faoliyat",
        noActivity: "Faoliyat yo'q",
        newRepository: "Yangi repozitoriy",
        navigation_items: {
          dashboard: "Boshqaruv paneli",
          myRepositories: "Mening repozitoriylarim",
          teamRepositories: "Jamoa repozitoriylari",
          usersAndTeams: "Foydalanuvchilar va jamoalar",
          settings: "Sozlamalar"
        }
      },
      header: {
        searchPlaceholder: "Qidirish",
        language: {
          title: "Tilni o'zgartirish",
          zh: "Xitoy",
          en: "Ingliz",
          ru: "Rus",
          kk: "Qozoq",
          uz: "O'zbek"
        },
        account: {
          myAccount: "Mening hisobim",
          profile: "Profil",
          settings: "Sozlamalar",
          logout: "Chiqish"
        }
      },
      languageDistribution_title: "Tillar taqsimoti",
      languageDistribution_noData: "Tillar taqsimoti bo'yicha ma'lumot yo'q",
      recentActivity_title: "So'nggi faoliyat",
      recentActivity_noData: "So'nggi faoliyat yo'q",
      time: {
        justNow: "hozirgina",
        minutesAgo: "{{value}} daqiqa oldin",
        hoursAgo: "{{value}} soat oldin",
        yesterday: "kecha",
        daysAgo: "{{value}} kun oldin"
      },
      in: "ichida",
      dashboard: {
        welcome: "ELEMENT-5 tizimiga xush kelibsiz",
        statsTitle: "Tizim statistikasi",
        repositoriesCount: "Jami repozitoriylar",
        usersCount: "Jami foydalanuvchilar",
        languagesCount: "Tillar soni",
        commitsCount: "So'nggi yuborishlar",
        createRepository: "Repozitoriy yaratish",
        filterByLanguage: "Til bo'yicha filtrlash",
        filterByUser: "Foydalanuvchi bo'yicha filtrlash",
        allLanguages: "Barcha tillar",
        allUsers: "Barcha foydalanuvchilar",
        listView: "Ro'yxat ko'rinishi",
        gridView: "Setka ko'rinishi"
      },
      repositories: {
        title: "Repozitoriylar",
        my: "Mening repozitoriylarim",
        team: "Jamoa repozitoriylari",
        newRepository: "Yangi repozitoriy",
        empty: "Repozitoriylar yo'q",
        createFirst: "Birinchi repozitoriyni yarating",
        search: "Repozitoriylarni qidirish",
        all_languages: "Barcha tillar",
        all_users: "Barcha foydalanuvchilar",
        all_visibility: "Barcha ko'rinishlar",
        recent: "So'nggi repozitoriylar",
        recentDescription: "Yaqinda yangilangan repozitoriylaringiz",
        notFound: "Repozitoriy topilmadi",
        noTeams: "Mavjud jamoalar yo'q",
        noDescription: "Tavsif yo'q",
        selectTeam: "Jamoani tanlang",
        teamDescription: "Umumiy repozitoriylar ustida jamoangiz bilan hamkorlik qiling",
        teamSelectPrompt: "Repozitoriylarni ko'rish uchun jamoani tanlang"
      },
      users: {
        title: "Foydalanuvchilar va jamoalar",
        subtitle: "Foydalanuvchilar va jamoalarni boshqarish",
        users: "Foydalanuvchilar",
        teams: "Jamoalar",
        user: "Foydalanuvchi",
        systemUsers: "Tizim foydalanuvchilari",
        username: "Foydalanuvchi nomi",
        fullName: "To'liq ism",
        created: "Yaratilgan",
        actions: "Harakatlar",
        noUsersFound: "Foydalanuvchilar topilmadi",
        addUser: "Foydalanuvchi qo'shish",
        addNewUser: "Yangi foydalanuvchi qo'shish",
        createNewUserDesc: "Tizimda yangi foydalanuvchi hisobini yarating.",
        password: "Parol",
        createUser: "Foydalanuvchi yaratish",
        createTeam: "Jamoa yaratish",
        createTeamDesc: "Repozitoriylar bo'yicha hamkorlik qilish uchun yangi jamoa yarating.",
        teamName: "Jamoa nomi",
        manageTeam: "Jamoani boshqarish"
      },
      warehouse: {
        products: "Mahsulotlar",
        warehouses: "Omborlar",
        inbound: "Kirish buyurtmalari",
        outbound: "Chiqish buyurtmalari",
        inventory: "Inventarizatsiya",
        ecommerce: "Elektron tijorat platformalari",
        barcode: "Shtrix-kod skaneri",
        settings: "Tizim sozlamalari"
      },
      settings: {
        title: "Tizim sozlamalari",
        subtitle: "Hisob sozlamalari va imtiyozlarini boshqarish",
        tabs: {
          account: "Hisob ma'lumotlari",
          security: "Xavfsizlik",
          notifications: "Bildirishnomalar",
          appearance: "Ko'rinish"
        },
        account: {
          title: "Hisob ma'lumotlari",
          description: "Hisobingiz va profil ma'lumotlarini yangilang",
          avatar: "Avatar",
          avatarUrl: "Avatar rasm URL",
          fullName: "To'liq ism",
          username: "Foydalanuvchi nomi",
          email: "Elektron pochta",
          saveButton: "O'zgarishlarni saqlash"
        },
        security: {
          title: "Xavfsizlik sozlamalari",
          description: "Parol va xavfsizlik imtiyozlarini boshqarish",
          currentPassword: "Joriy parol",
          newPassword: "Yangi parol",
          confirmPassword: "Yangi parolni tasdiqlang",
          changePasswordButton: "Parolni o'zgartirish",
          twoFactorAuth: "Ikki faktorli autentifikatsiya",
          twoFactorDescription: "Hisobingizga qo'shimcha xavfsizlik darajasini qo'shish uchun ikki faktorli autentifikatsiyani yoqing",
          enableTwoFactorButton: "Ikki faktorli autentifikatsiyani yoqish"
        },
        notifications: {
          title: "Bildirishnoma sozlamalari",
          description: "Bildirishnomalar va ogohlantirishlarni qanday olishni boshqarish",
          emailNotifications: "Elektron pochta bildirishnomalari",
          emailNotificationsDescription: "Muhim yangilanishlar uchun elektron pochta orqali bildirishnomalarni olish",
          repositoryActivity: "Repozitoriy faoliyati",
          repositoryActivityDescription: "Yuborishlar, tarmoqlar va so'rovlar haqida bildirishnomalar",
          teamActivity: "Jamoa faoliyati",
          teamActivityDescription: "Jamoa a'zolari o'zgarishlari haqida bildirishnomalar",
          securityAlerts: "Xavfsizlik ogohlantirmalari",
          securityAlertsDescription: "Muhim xavfsizlik yangilanishlari va zaifliklar haqida bildirishnomalar",
          saveButton: "Imtiyozlarni saqlash"
        },
        appearance: {
          title: "Ko'rinish sozlamalari",
          description: "ELEMENT-5 tizimining ko'rinishini sozlash",
          darkMode: "Qorong'i rejim",
          darkModeDescription: "Qorong'i mavzudan foydalanish",
          language: "Tizim tili",
          selectLanguage: "Tilni tanlang",
          saveButton: "Imtiyozlarni saqlash"
        }
      }
    }
  }
};

// 初始化 i18n 配置
i18n
  .use(initReactI18next)
  .init({
    resources, // 直接使用内嵌的翻译资源
    lng: 'zh', // 默认使用中文
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    defaultNS: 'common',
    react: {
      useSuspense: false
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
  
  // 更改语言
  i18n.changeLanguage(langCode).then(() => {
    
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

// 初始化
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

export default i18n;