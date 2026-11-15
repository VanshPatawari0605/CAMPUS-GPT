import type { Lang } from "./types";

export const LANGUAGE_LABELS: Record<Lang, string> = { en: "English", hi: "हिन्दी", or: "ଓଡ଼ିଆ" };

type Dict = Record<string, string>;

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.assistant": "AI Assistant",
  "nav.notices": "Notices",
  "nav.deadlines": "Deadlines",
  "nav.quizzes": "Practice Quizzes",
  "nav.profile": "My Profile",
  "nav.logout": "Log out",
  "dash.welcome": "Welcome back",
  "dash.askTitle": "Ask CampusGPT",
  "dash.askBody": "Get answers from official college documents, with page-level sources.",
  "dash.askButton": "Start a chat",
  "dash.deadlines": "Upcoming deadlines",
  "dash.notices": "Recent notices",
  "dash.chats": "Recent chats",
  "dash.quiz": "Practice",
  "dash.announcements": "Announcements",
  "dash.none": "Nothing here yet",
  "chat.placeholder": "Ask about attendance, exams, placements...",
  "chat.new": "New chat",
  "chat.send": "Send",
  "chat.sources": "Sources",
  "chat.thinking": "Searching documents...",
  "chat.empty": "Ask a question about your college documents",
};

const hi: Dict = {
  "nav.dashboard": "डैशबोर्ड",
  "nav.assistant": "एआई सहायक",
  "nav.notices": "सूचनाएँ",
  "nav.deadlines": "समय-सीमाएँ",
  "nav.quizzes": "अभ्यास क्विज़",
  "nav.profile": "मेरी प्रोफ़ाइल",
  "nav.logout": "लॉग आउट",
  "dash.welcome": "वापसी पर स्वागत है",
  "dash.askTitle": "CampusGPT से पूछें",
  "dash.askBody": "आधिकारिक कॉलेज दस्तावेज़ों से पेज-स्तर के स्रोतों के साथ उत्तर पाएँ।",
  "dash.askButton": "चैट शुरू करें",
  "dash.deadlines": "आगामी समय-सीमाएँ",
  "dash.notices": "हाल की सूचनाएँ",
  "dash.chats": "हाल की चैट",
  "dash.quiz": "अभ्यास",
  "dash.announcements": "घोषणाएँ",
  "dash.none": "अभी कुछ नहीं है",
  "chat.placeholder": "उपस्थिति, परीक्षा, प्लेसमेंट के बारे में पूछें...",
  "chat.new": "नई चैट",
  "chat.send": "भेजें",
  "chat.sources": "स्रोत",
  "chat.thinking": "दस्तावेज़ खोजे जा रहे हैं...",
  "chat.empty": "अपने कॉलेज दस्तावेज़ों के बारे में प्रश्न पूछें",
};

const or: Dict = {
  "nav.dashboard": "ଡ୍ୟାସବୋର୍ଡ",
  "nav.assistant": "ଏଆଇ ସହାୟକ",
  "nav.notices": "ବିଜ୍ଞପ୍ତି",
  "nav.deadlines": "ଶେଷ ତାରିଖ",
  "nav.quizzes": "ଅଭ୍ୟାସ କୁଇଜ୍",
  "nav.profile": "ମୋ ପ୍ରୋଫାଇଲ୍",
  "nav.logout": "ଲଗ୍ ଆଉଟ୍",
  "dash.welcome": "ପୁନର୍ବାର ସ୍ୱାଗତ",
  "dash.askTitle": "CampusGPT କୁ ପଚାରନ୍ତୁ",
  "dash.askBody": "ପୃଷ୍ଠା-ସ୍ତରୀୟ ଉତ୍ସ ସହିତ ସରକାରୀ କଲେଜ ଦସ୍ତାବିଜରୁ ଉତ୍ତର ପାଆନ୍ତୁ।",
  "dash.askButton": "ଚାଟ୍ ଆରମ୍ଭ କରନ୍ତୁ",
  "dash.deadlines": "ଆସୁଥିବା ଶେଷ ତାରିଖ",
  "dash.notices": "ସାମ୍ପ୍ରତିକ ବିଜ୍ଞପ୍ତି",
  "dash.chats": "ସାମ୍ପ୍ରତିକ ଚାଟ୍",
  "dash.quiz": "ଅଭ୍ୟାସ",
  "dash.announcements": "ଘୋଷଣା",
  "dash.none": "ଏପର୍ଯ୍ୟନ୍ତ କିଛି ନାହିଁ",
  "chat.placeholder": "ଉପସ୍ଥିତି, ପରୀକ୍ଷା, ପ୍ଲେସମେଣ୍ଟ ବିଷୟରେ ପଚାରନ୍ତୁ...",
  "chat.new": "ନୂଆ ଚାଟ୍",
  "chat.send": "ପଠାନ୍ତୁ",
  "chat.sources": "ଉତ୍ସ",
  "chat.thinking": "ଦସ୍ତାବିଜ ଖୋଜାଯାଉଛି...",
  "chat.empty": "ଆପଣଙ୍କ କଲେଜ ଦସ୍ତାବିଜ ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ",
};

const dictionaries: Record<Lang, Dict> = { en, hi, or };

export const translate = (lang: Lang, key: string) => dictionaries[lang]?.[key] ?? en[key] ?? key;
