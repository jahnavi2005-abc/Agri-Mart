import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Translation files
const resources = {
  en: {
    translation: {
      "nav.home": "Home",
      "nav.listings": "Marketplace",
      "nav.dashboard": "Dashboard",
      "nav.login": "Log In",
      "nav.search_placeholder": "Search crops, vegetables...",
      "product.add_to_cart": "Add to Cart",
      "product.buy_now": "Buy Now",
      "product.price_per_kg": "Price per kg",
      "product.live_auction": "Live Auction",
      "product.place_bid": "Place Bid",
    },
  },
  hi: {
    translation: {
      "nav.home": "मुख्य पृष्ठ",
      "nav.listings": "बाज़ार",
      "nav.dashboard": "डैशबोर्ड",
      "nav.login": "लॉग इन",
      "nav.search_placeholder": "फसलें, सब्जियां खोजें...",
      "product.add_to_cart": "कार्ट में डालें",
      "product.buy_now": "अभी खरीदें",
      "product.price_per_kg": "प्रति किलो मूल्य",
      "product.live_auction": "लाइव नीलामी",
      "product.place_bid": "बोली लगाएं",
    },
  },
  te: {
    translation: {
      "nav.home": "హోమ్",
      "nav.listings": "మార్కెట్",
      "nav.dashboard": "డ్యాష్‌బోర్డ్",
      "nav.login": "లాగిన్",
      "nav.search_placeholder": "పంటలు, కూరగాయలు వెతకండి...",
      "product.add_to_cart": "కార్ట్‌కు జోడించు",
      "product.buy_now": "ఇప్పుడే కొనండి",
      "product.price_per_kg": "కిలో ధర",
      "product.live_auction": "లైవ్ వేలం",
      "product.place_bid": "బిడ్ వేయండి",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
