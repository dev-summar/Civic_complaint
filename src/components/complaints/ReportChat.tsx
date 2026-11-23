import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, DeviceEventEmitter, Keyboard, NativeModules, PermissionsAndroid, Platform, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {Pressable} from 'react-native-gesture-handler';
import {useFocusEffect} from '@react-navigation/native';
import {AppIcon, Button, Card, Header, Text} from '@/components/ui';
import {post} from '@/services/api';
import {createComplaintWithMedia, getMyComplaints} from '@/services/complaint.service';
import {classifyPhoto} from '@/services/engagement.service';
import {formatDateTime, formatStatus} from '@/utils/format';
import {CATEGORY_META} from '@/constants';
import type {Complaint, Coordinates, CreateComplaintData, PhotoSuggestion} from '@/types';
import {useTheme} from '@/theme';
import {useLocation} from '@/hooks/useLocation';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {LocationPicker, MiniMap} from '@/components/maps';
import {PhotoPickerGrid, type PhotoItem} from './PhotoPickerGrid';
import {ComplaintOwnership} from './ComplaintOwnership';
import {photoCopy} from './photoCopy';
import {chatUxCopy} from './chatUxCopy';
import {chooseReportPhoto} from '@/utils/photo';
import {createWebVoice} from './webVoice';
import {spokenAudio, spokenBase64, transcribedSpeech, invalidateSpoken, voiceCode} from './cloudVoice';
import {SetuAvatar, type AvatarMood} from './SetuAvatar';

type Language = NonNullable<CreateComplaintData['language']>;
type Message = {role: 'user' | 'assistant'; content: string; spokenReply?: string; language?: Language};
type Draft = Pick<CreateComplaintData, 'title' | 'description' | 'category'>;

export type ReportVoice = {
  prepare?: (language: string) => Promise<boolean>;
  listen: (language: string) => Promise<string | {text: string; confidence?: number} | null>;
  stopListening: () => void;
  speak: (text: string, language: string) => Promise<boolean>;
  cancel: () => void;
};

const deviceVoice: ReportVoice | undefined = Platform.OS === 'web' ? createWebVoice() : undefined;
const nativeModule = Platform.OS === 'android' ? NativeModules.ReportVoice : undefined;
// Same order as Legal Setu: Bhashini hears and speaks these languages; the phone voice is the fallback.
const bhashiniVoice = new Set(['en', 'hi', 'hinglish', 'doi', 'ks']);
const nativeVoice: ReportVoice | undefined = nativeModule ? {
  prepare: language => nativeModule.prepare(language),
  listen: async language => {
    const code = voiceCode(language);
    if (bhashiniVoice.has(code) && nativeModule.capture) {
      const audio = await nativeModule.capture();
      if (!audio) return null;
      try {
        const text = await transcribedSpeech(audio, code);
        return text ? {text, confidence: 1} : null;
      } catch (error) {
        const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message;
        throw {code: 'VOICE_NETWORK', message};
      }
    }
    return nativeModule.listen(language);
  },
  stopListening: () => nativeModule.stopListening(),
  cancel: () => { invalidateSpoken(); nativeModule.cancel(); },
  speak: async (text, language) => {
    const code = voiceCode(language);
    if (bhashiniVoice.has(code) && nativeModule.playAudio) {
      try {
        const audio = await spokenAudio(text, language);
        if (audio == null) return false;
        if (audio) {
          const played = await nativeModule.playAudio(spokenBase64(audio));
          if (played) return true;
        }
      } catch {
        /* Phone voice below, when Bhashini has no clip. */
      }
    }
    const locale = code === 'ur' ? 'ur-IN' : code === 'ks' ? 'ks-IN' : code === 'en' ? 'en-US' : 'hi-IN';
    const local = await nativeModule.speak(text, locale);
    if (local) return true;
    if (bhashiniVoice.has(code)) return false;
    try {
      const audio = await spokenAudio(text, language);
      if (audio == null) return false;
      if (audio && nativeModule.playAudio) return nativeModule.playAudio(spokenBase64(audio));
    } catch {
      /* The phone has no voice for this language. */
    }
    return false;
  },
} : deviceVoice;
const speechLocale = {en: 'en-US', hi: 'hi-IN', hinglish: 'hinglish', ur: 'ur-IN', ks: 'ks-IN', doi: 'doi-IN'};
const playbackLocale = {en: 'en-US', hi: 'hi-IN', hinglish: 'hi-IN', ur: 'ur-IN', ks: 'ks-IN', doi: 'doi-IN'};
const scriptFont = {fontFamily: "'Noto Sans Devanagari', 'Noto Sans Arabic', 'Inter', sans-serif"};
const voiceGreeting: Record<Language, string> = {
  en: 'English. Tell me the problem.',
  hi: 'हिन्दी। समस्या बताइए।',
  hinglish: 'Hinglish. Problem bataiye.',
  ur: 'اردو۔ مسئلہ بتائیے۔',
  ks: 'کٲشُر۔ مسئلہ وَنِو۔',
  doi: 'डोगरी। समस्या बताओ।',
};
const reviewReply: Record<Language, string> = {
  en: 'Got it. I am filing this from where you are.',
  hi: 'ठीक है। मैं आपकी मौजूदा जगह से शिकायत दर्ज कर रहा हूँ।',
  hinglish: 'Theek hai. Main aapki jagah se complaint file kar raha hoon.',
  ur: 'ٹھیک ہے۔ میں آپ کی موجودہ جگہ سے شکایت درج کر رہا ہوں۔',
  ks: 'ٹھیک۔ بہٕ تُہٕنٛزِ موجودہ جاے پؠٹھ رپورٹ درج کَران چھُس۔',
  doi: 'ठीक ऐ। मैं तुहाडी मौजूदा जगह तों शिकायत दर्ज करा करदा ऐ।',
};
const spokenReview: Record<Language, string> = {...reviewReply, hinglish: 'ठीक है। मैं आपकी जगह से शिकायत दर्ज कर रहा हूँ।'};

function replyLanguage(_message: string, selected: Language): Language {
  return selected;
}

function localize<T extends Record<string, string>>(table: Record<'en' | 'hi' | 'hinglish', T>, language: Language, extra?: Partial<Record<'ur' | 'ks' | 'doi', Partial<Record<keyof T, string>>>>): T {
  if (language === 'en' || language === 'hi' || language === 'hinglish') return table[language];
  const base = language === 'doi' ? table.hi : table.en;
  return {...base, ...extra?.[language]} as T;
}
const interactionCopy = {
  en: {startingVoice: 'Starting voice…', connecting: 'Getting the mic ready…', processing: 'Finishing your words…', interrupt: 'Tap to interrupt', listening: 'I’m listening', hint: 'Speak naturally. Pause when you’re done.', review: 'Please check what I heard, then send or try the mic again.', network: 'Check your connection, then try the mic again.', language: 'This speech language is not installed on your phone. Try another language or type.', privacy: 'The mic turns on only when you start a conversation.'},
  hi: {startingVoice: 'आवाज़ शुरू हो रही है…', connecting: 'माइक्रोफ़ोन तैयार हो रहा है…', processing: 'आपके शब्द समझ रहे हैं…', interrupt: 'बीच में बोलने के लिए दबाएं', listening: 'आपकी बात सुन रहे हैं', hint: 'आराम से बोलें। बात पूरी होने पर रुक जाएं।', review: 'पहचाने गए शब्द जाँचकर भेजें, या फिर बोलें।', network: 'इंटरनेट जाँचें, फिर माइक्रोफ़ोन दबाएं।', language: 'यह भाषा आपके फ़ोन की आवाज़ सेवा में उपलब्ध नहीं है। दूसरी भाषा चुनें या लिखें।', privacy: 'बातचीत शुरू करने पर ही माइक्रोफ़ोन चालू होता है।'},
  hinglish: {startingVoice: 'Awaaz shuru ho rahi hai…', connecting: 'Mic taiyaar ho raha hai…', processing: 'Aapke words samajh rahe hain…', interrupt: 'Beech mein bolne ke liye tap karein', listening: 'Aapki baat sun rahe hain', hint: 'Aaraam se bolein. Baat poori hone par ruk jaayein.', review: 'Jo suna hai use check karke bhejein, ya phir bolein.', network: 'Internet check karein, phir mic try karein.', language: 'Yeh speech language phone mein installed nahi hai. Doosri language chunein ya type karein.', privacy: 'Conversation shuru karne par hi mic on hota hai.'},
};
const voiceCopy = {
  en: {speak: 'Speak your complaint', finish: 'Finish speaking', listening: 'Listening…', read: 'Read replies aloud', replay: 'Hear reply', permission: 'Allow the microphone for this site, then tap the mic again. Use the lock icon in the address bar.', missed: 'No speech was captured. Try again or type your message.', unavailable: 'The microphone could not start. Allow it in the address bar and try again.', playback: 'This voice is unavailable on your phone.'},
  hi: {speak: 'बोलकर शिकायत बताएं', finish: 'बोलना पूरा हुआ', listening: 'सुन रहा है…', read: 'जवाब सुनें', replay: 'जवाब फिर सुनें', permission: 'बोलकर शिकायत बताने के लिए माइक्रोफ़ोन की अनुमति दें।', missed: 'आवाज़ सुनाई नहीं दी। फिर कोशिश करें या संदेश लिखें।', unavailable: 'आवाज़ पहचानने की सुविधा उपलब्ध नहीं है। फिर कोशिश करें या संदेश लिखें।', playback: 'यह आवाज़ आपके फ़ोन पर उपलब्ध नहीं है।'},
  hinglish: {speak: 'Bolkar complaint batayein', finish: 'Bolna ho gaya', listening: 'Sun raha hai…', read: 'Replies sunayein', replay: 'Reply phir sunein', permission: 'Bolkar complaint batane ke liye mic permission dein.', missed: 'Awaaz capture nahi hui. Phir try karein ya message type karein.', unavailable: 'Voice recognition available nahi hai. Phir try karein ya message type karein.', playback: 'Yeh voice aapke phone par available nahi hai.'},
};

const options = [
  {label: 'English', value: 'en'},
  {label: 'हिन्दी', value: 'hi'},
  {label: 'Hinglish', value: 'hinglish'},
  {label: 'اردو', value: 'ur'},
  {label: 'کٲشُر', value: 'ks'},
  {label: 'डोगरी', value: 'doi'},
];
const copy = {
  en: {hello: 'Describe the issue. You can mention a nearby landmark and set the exact location on the map next.', input: 'Type your message', send: 'Send', review: 'Continue to map', track: 'Check complaint status', open: 'Open complaint', empty: 'No matching complaint found.', error: 'Chat is temporarily unavailable. You can use the report form.', trackError: 'Could not load complaint status. Try again.', due: 'Expected resolution'},
  hi: {hello: 'समस्या बताइए। चाहें तो पास की कोई पहचान वाली जगह बताएं। सही स्थान अगले चरण में नक्शे पर चुनें।', input: 'अपना संदेश लिखें', send: 'भेजें', review: 'नक्शे पर स्थान चुनें', track: 'शिकायत की स्थिति देखें', open: 'शिकायत खोलें', empty: 'कोई संबंधित शिकायत नहीं मिली।', error: 'चैट अभी उपलब्ध नहीं है। शिकायत फ़ॉर्म का उपयोग करें।', trackError: 'शिकायत की स्थिति नहीं मिली। फिर कोशिश करें।', due: 'समाधान की समय-सीमा'},
  hinglish: {hello: 'Problem bataiye. Paas ka landmark bata sakte hain. Exact jagah agle step mein map par select karein.', input: 'Apna message likhein', send: 'Bhejein', review: 'Map par pin lagayein', track: 'Complaint ka status dekhein', open: 'Complaint kholein', empty: 'Koi matching complaint nahi mili.', error: 'Chat abhi available nahi hai. Report form use karein.', trackError: 'Complaint status load nahi hua. Phir try karein.', due: 'Fix ki deadline'},
};

const screenCopy = {
  en: {step: 'Describe → Pin → Submit', prompt: 'What needs fixing?', example: 'The drain is overflowing near the school.', transcript: 'Your words are sent when you finish speaking.', ready: 'Draft ready', thinking: 'Preparing a reply…', checking: 'Checking your complaint…', next: 'Next, set the location on the map.'},
  hi: {step: 'चरण 1 / 2 · समस्या बताएं', prompt: 'क्या ठीक करने की ज़रूरत है?', example: 'स्कूल के पास नाली का पानी उफन रहा है।', transcript: 'भेजने से पहले अपने शब्द जाँचें या बदलें।', ready: 'मसौदा तैयार है', thinking: 'जवाब तैयार हो रहा है…', checking: 'शिकायत की स्थिति देख रहे हैं…', next: 'अगले चरण में नक्शे पर स्थान चुनें।'},
  hinglish: {step: 'Step 1 of 2 · Problem batayein', prompt: 'Kya theek karna hai?', example: 'School ke paas naali overflow ho rahi hai.', transcript: 'Send karne se pehle transcript check ya edit karein.', ready: 'Draft ready hai', thinking: 'Reply bana rahe hain…', checking: 'Complaint ka status check ho raha hai…', next: 'Agla step map par pin lagana hai.'},
};

const flowCopy = {
  en: {start: 'Start voice conversation', stop: 'End voice conversation', explaining: 'Speak naturally. I will reply aloud and file the report from your current location.', map: 'Your location', mapHint: 'Taken from where you are.', gps: 'Use my location', selected: 'Location selected', optional: 'Add a photo · optional', change: 'Change the complaint', submit: 'Submit', choose: 'Location is still needed', submitting: 'Filing from your current location…', submitted: 'Complaint submitted', assigned: 'Assigned to', waiting: 'Your officer will assign a worker.', view: 'Track this complaint', failed: 'Submission could not be confirmed. Retry to check and complete the same report.', retry: 'Retry submission', speaking: 'AI is speaking…', mapStep: 'Location', done: 'Report filed', editHint: 'You can type corrections or tap the mic to add details.'},
  hi: {start: 'बोलकर बातचीत शुरू करें', stop: 'बातचीत बंद करें', explaining: 'समस्या बोलकर बताएं। मैं जवाब सुनाऊँगा और आपकी जगह से शिकायत दर्ज करूँगा।', map: 'स्थान नहीं मिल सका', mapHint: 'स्थान नहीं पढ़ा जा सका। नक्शे पर जगह चुनें या GPS फिर आज़माएँ।', gps: 'मेरा स्थान चुनें', selected: 'स्थान चुना गया', optional: 'फ़ोटो जोड़ें · वैकल्पिक', change: 'शिकायत बदलें', submit: 'भेजें', choose: 'स्थान अभी चाहिए', submitting: 'आपकी जगह से शिकायत दर्ज हो रही है…', submitted: 'शिकायत दर्ज हो गई', assigned: 'कर्मचारी', waiting: 'अधिकारी कर्मचारी नियुक्त करेंगे।', view: 'शिकायत की स्थिति देखें', failed: 'शिकायत भेजने की पुष्टि नहीं हुई। उसी शिकायत को पूरा करने के लिए फिर कोशिश करें।', retry: 'फिर कोशिश करें', speaking: 'AI जवाब सुना रहा है…', mapStep: 'स्थान चाहिए', done: 'शिकायत दर्ज है', editHint: 'सुधार लिखें या अधिक जानकारी के लिए माइक्रोफ़ोन दबाएं।'},
  hinglish: {start: 'Voice conversation shuru karein', stop: 'Conversation band karein', explaining: 'Problem bolkar batayein. Main reply sunaunga aur aapki jagah se complaint file karunga.', map: 'Problem kahan hai?', mapHint: 'Map par exact jagah tap karein. Agar aap wahin hain toh GPS use karein.', gps: 'Meri location use karein', selected: 'Location select ho gayi', optional: 'Photo jodein · optional', change: 'Complaint badlein', submit: 'Location confirm karke submit karein', choose: 'Submit karne ke liye location select karein', submitting: 'Complaint submit ho rahi hai…', submitted: 'Complaint submit ho gayi', assigned: 'Worker assign hua', waiting: 'Officer worker assign karenge.', view: 'Complaint track karein', failed: 'Submission confirm nahi hua. Isi report ko complete karne ke liye retry karein.', retry: 'Phir try karein', speaking: 'AI jawab suna raha hai…', mapStep: 'Location confirm karein', done: 'Complaint submit ho gayi', editHint: 'Correction type karein ya mic se details batayein.'},
};

const urduUx = {talk: 'بیان', location: 'جگہ', done: 'درج', type: 'لکھ کر بتائیں', voice: 'بول کر بتائیں', photo: 'تصویر شامل کریں', tap: 'بولنے کے لیے دبائیں', title: 'شکایت کا عنوان', details: 'کیا ٹھیک کرنا ہے', edit: 'تفصیل بدلیں', review: 'اپنی شکایت دیکھیں', save: 'تبدیلی ہو گئی', intro: 'بتائیں کیا ٹھیک کرنا ہے۔ میں آپ کی بات یا تصویر سے شکایت تیار کروں گا۔', finish: 'بات پوری ہونے پر رک جائیں یا بٹن دبائیں۔', ready: 'آپ کی بات۔ آپ کی زبان۔', optional: 'سمجھانے کے لیے تصویر بھی شامل کر سکتے ہیں۔'};
const kashmiriUx = {talk: 'بیان', location: 'جاے', done: 'درج', type: 'لکھِتھ وَنِو', voice: 'بولِتھ وَنِو', photo: 'فوٹو جوڑِو', tap: 'بولنہٕ خٲطرٕ دبٲیو', title: 'رپورٹُک عنوان', details: 'کیا چھُ ٹھیک کرُن', edit: 'تفصیل بدلِو', review: 'پنٕنۍ رپورٹ وچھِو', save: 'تبدیلی گَے', intro: 'وَنِو کیا چھُ ٹھیک کرُن۔ بہٕ تُہٕنٛزِ باتٕ یا فوٹو سۭتۍ رپورٹ تیار کَرٕ۔', finish: 'بات پوری گَژھنہٕ پتہٕ رُکِو یا بٹن دبٲیو۔', ready: 'تُہٕنٛز بات۔ تُہٕنٛز زبان۔', optional: 'سمجھاونہٕ خٲطرٕ فوٹو تہِ جوڑِو۔'};
const dogriUx = {talk: 'समस्या', location: 'जगह', done: 'दर्ज', type: 'लिखी के बताओ', voice: 'बोल के बताओ', photo: 'फोटो जोड़ो', tap: 'बोलन लेई दबाओ', title: 'शिकायत दा शीर्षक', details: 'क्या ठीक करना ऐ', edit: 'विवरण बदलो', review: 'अपनी शिकायत देखो', save: 'बदलाव हो गया', intro: 'बताओ क्या ठीक करना ऐ। मैं तुहाडी गल्ल या फोटो तों शिकायत तैयार करांगा।', finish: 'गल्ल पूरी होन पर रुको या बटन दबाओ।', ready: 'तुहाडी गल्ल। तुहाडी भाषा।', optional: 'समझावन लेई फोटो भी जोड़ो।'};
const urduScreen = {step: 'بتائیں → پن → بھیجیں', prompt: 'کیا ٹھیک کرنا ہے؟', example: 'گھر کے پاس نالی کا پانی بہہ رہا ہے۔', transcript: 'بولنا ختم ہونے پر آپ کے الفاظ چلے جائیں گے۔', ready: 'مسودہ تیار ہے', thinking: 'جواب تیار ہو رہا ہے…', checking: 'شکایت دیکھی جا رہی ہے…', next: 'اگلے مرحلے میں نقشے پر جگہ چنیں۔'};
const kashmiriScreen = {step: 'وَنِو → پِن → سوزِو', prompt: 'کیا چھُ ٹھیک کرُن؟', example: 'گَرِ نَذدیک چھےٚ نال بہان۔', transcript: 'بولُن ختم گَژھنہٕ پتہٕ لفظ گَژھن۔', ready: 'مسودہ تیار چھُ', thinking: 'جواب تیار گَژھان چھُ…', checking: 'رپورٹ وچھان چھِ…', next: 'اَگہِ مرحلہٕ منز نقشس پؠٹھ جاے ژٲرِو۔'};
const dogriScreen = {step: 'बताओ → पिन → भेजो', prompt: 'क्या ठीक करना ऐ?', example: 'घर दे नेड़े नाली दा पानी बह्आ करदा ऐ।', transcript: 'बोलना मुकण पर तुहाडे शब्द चले जान।', ready: 'मसौदा तैयार ऐ', thinking: 'जवाब तैयार होआ करदा ऐ…', checking: 'शिकायत देखी जा करदी ऐ…', next: 'अगले कदम च नक्शे पर जगह चुनो।'};
const urduFlow = {start: 'بول کر بات شروع کریں', stop: 'بات بند کریں', explaining: 'مسئلہ بول کر بتائیں۔ میں جواب سناؤں گا اور آپ کی موجودہ جگہ سے شکایت درج کروں گا۔', map: 'مسئلہ کہاں ہے؟', mapHint: 'نقشے پر صحیح جگہ چنیں۔ اگر آپ وہیں ہیں تو GPS استعمال کریں۔', gps: 'میری جگہ استعمال کریں', selected: 'جگہ منتخب ہو گئی', optional: 'تصویر شامل کریں · اختیاری', change: 'شکایت بدلیں', submit: 'جگہ کی تصدیق کریں اور بھیجیں', choose: 'بھیجنے کے لیے جگہ چنیں', submitting: 'شکایت بھیجی جا رہی ہے…', submitted: 'شکایت درج ہو گئی', assigned: 'کارکن', waiting: 'افسر کارکن مقرر کریں گے۔', view: 'شکایت کی صورتحال دیکھیں', failed: 'شکایت بھیجنے کی تصدیق نہیں ہوئی۔ پھر کوشش کریں۔', retry: 'پھر کوشش کریں', speaking: 'آواز تیار ہو رہی ہے…', mapStep: 'جگہ کی تصدیق کریں', done: 'شکایت درج ہے', editHint: 'درستگی لکھیں یا مزید بتانے کے لیے مائیک دبائیں۔'};
const kashmiriFlow = {start: 'بولِتھ بات شروع کٔرِو', stop: 'بات بند کٔرِو', explaining: 'مسئلہ بولِتھ وَنِو۔ بہٕ جواب بوزاوٕ تہٕ تُہٕنٛزِ موجودہ جاے پؠٹھ رپورٹ درج کَرٕ۔', map: 'مسئلہ کتہِ چھُ؟', mapHint: 'نقشس پؠٹھ صحیح جاے ژٲرِو۔ اگر تُہۍ تتہِ چھِو تیلہٕ GPS استعمال کٔرِو۔', gps: 'میٲنۍ جاے استعمال کٔرِو', selected: 'جاے منتخب گَے', optional: 'فوٹو جوڑِو · اختیاری', change: 'رپورٹ بدلِو', submit: 'جاے تصدیق کٔرِو تہٕ سوزِو', choose: 'سوزنہٕ خٲطرٕ جاے ژٲرِو', submitting: 'رپورٹ سوزان چھِ…', submitted: 'رپورٹ درج گَے', assigned: 'کارکن', waiting: 'افسر کارکن مقرر کرن۔', view: 'رپورٹُک حال وچھِو', failed: 'رپورٹ سوزنُک تصدیق گَے نہٕ۔ دُبارٕ کوشش کٔرِو۔', retry: 'دُبارٕ کوشش کٔرِو', speaking: 'آواز تیار گَژھان چھِ…', mapStep: 'جاے تصدیق کٔرِو', done: 'رپورٹ درج چھِ', editHint: 'درستگی لکھِو یا مزید وَننہٕ خٲطرٕ مائیک دبٲیو۔'};
const dogriFlow = {start: 'बोल के गल्ल शुरू करो', stop: 'गल्ल बंद करो', explaining: 'समस्या बोल के बताओ। मैं जवाब सुनांगा ते तुहाडी जगह तों शिकायत दर्ज करांगा।', map: 'समस्या कित्थे ऐ?', mapHint: 'नक्शे पर सही जगह चुनो। जे तुस उथे ओ तां GPS इस्तेमाल करो।', gps: 'मेरी जगह इस्तेमाल करो', selected: 'जगह चुन ली', optional: 'फोटो जोड़ो · वैकल्पिक', change: 'शिकायत बदलो', submit: 'जगह पक्की करो ते भेजो', choose: 'भेजण लेई जगह चुनो', submitting: 'शिकायत भेजी जा करदी ऐ…', submitted: 'शिकायत दर्ज हो गई', assigned: 'कर्मचारी', waiting: 'अफसर कर्मचारी लगांगे।', view: 'शिकायत दा हाल देखो', failed: 'शिकायत भेजण दी पुष्टि नहीं होई। फेर कोशिश करो।', retry: 'फेर कोशिश करो', speaking: 'आवाज तैयार होआ करदी ऐ…', mapStep: 'जगह पक्की करो', done: 'शिकायत दर्ज ऐ', editHint: 'सुधार लिखो या होर दसन लेई माइक दबाओ।'};

const photoAnswers: Record<Language, {yes: string; no: string}> = {
  en: {yes: 'Yes, add a photo', no: 'No, file it'},
  hi: {yes: 'हाँ, फ़ोटो जोड़ें', no: 'नहीं, दर्ज करें'},
  hinglish: {yes: 'Haan, photo jodein', no: 'Nahi, file karein'},
  ur: {yes: 'ہاں، تصویر لگائیں', no: 'نہیں، درج کریں'},
  ks: {yes: 'آ، فوٹو جوڑِو', no: 'نہ، درج کٔرِو'},
  doi: {yes: 'हां, फोटो जोड़ो', no: 'नेईं, दर्ज करो'},
};

const hindiStatus: Record<string, string> = {
  submitted: 'शिकायत दर्ज है', acknowledged: 'समीक्षा में', assigned: 'कर्मचारी नियुक्त है',
  in_progress: 'काम चल रहा है', resolved: 'समाधान की पुष्टि बाकी है', closed: 'शिकायत बंद है',
  rejected: 'शिकायत अस्वीकृत है',
};
const hinglishStatus: Record<string, string> = {
  submitted: 'Complaint darj hai', acknowledged: 'Review chal raha hai', assigned: 'Worker assign ho gaya',
  in_progress: 'Kaam chal raha hai', resolved: 'Fix ki confirmation baaki hai', closed: 'Complaint close ho gayi',
  rejected: 'Complaint reject ho gayi',
};

function statusLabel(complaint: Complaint, language: Language) {
  const labels = language === 'hi' ? hindiStatus : language === 'hinglish' ? hinglishStatus : null;
  return labels?.[complaint.status] ?? formatStatus(complaint.status);
}

interface Props {
  initialLanguage: Language;
  onBack: () => void;
  onTrack: (id: string) => void;
  voiceAdapter?: ReportVoice;
  bottomInset?: number;
}

export function ReportChat({initialLanguage, onBack, onTrack, voiceAdapter = nativeVoice, bottomInset = 0}: Props) {
  const voice = voiceAdapter;
  const desktop = useDesktopLayout();
  const {colors, spacing} = useTheme();
  const [language, setLanguage] = useState(initialLanguage);
  const [messages, setMessages] = useState<Message[]>([]);
  const conversationMessages = useRef<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(!voice);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tracked, setTracked] = useState<Complaint | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [captureState, setCaptureState] = useState<'connecting' | 'ready' | 'processing'>('connecting');
  const [partial, setPartial] = useState('');
  const partialWords = useRef('');
  const [level, setLevel] = useState(0);
  const [transcribed, setTranscribed] = useState(false);
  const [outgoing, setOutgoing] = useState('');
  const [checking, setChecking] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const readAloudEnabled = useRef(false);
  readAloudEnabled.current = readAloud;
  const [speaking, setSpeaking] = useState(false);
  const [startingVoice, setStartingVoice] = useState(false);
  const speechPlaying = useRef(false);
  const [conversation, setConversation] = useState(false);
  const [stage, setStage] = useState<'talk' | 'location' | 'submitted'>('talk');
  const [pin, setPin] = useState<Coordinates | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoAsk, setPhotoAsk] = useState(false);
  const [fileTick, setFileTick] = useState(0);
  const [photoResult, setPhotoResult] = useState<PhotoSuggestion | null>(null);
  const [photoApproved, setPhotoApproved] = useState<PhotoSuggestion | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const photoRun = useRef(0);
  const photoAbort = useRef<AbortController | null>(null);
  const [submitted, setSubmitted] = useState<Complaint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const {location, refresh, isLoading: locating, error: locationError} = useLocation(false);
  const pending = useRef(false);
  const voicePending = useRef(false);
  const focusId = useRef(0);
  const focused = useRef(true);
  const playbackId = useRef(0);
  const chatAbort = useRef<AbortController | null>(null);
  const conversationActive = useRef(false);
  const gpsWanted = useRef(false);
  const voiceHeard = useRef(false);
  const autoFile = useRef(false);
  const filing = useRef(false);
  const submitRef = useRef<(coords?: Coordinates) => Promise<void>>(async () => {});
  const locationRef = useRef<Coordinates | null>(null);
  const locationFailed = useRef(false);
  locationRef.current = location;
  locationFailed.current = Boolean(locationError && !location);
  const submission = useRef<{data: CreateComplaintData; photos: PhotoItem[]} | null>(null);
  const thread = useRef<ScrollView>(null);
  const shouldScroll = useRef(false);
  const rtl = language === 'ur' || language === 'ks';
  const script = language === 'en' || language === 'hinglish' ? undefined : scriptFont;
  const strings = localize(copy, language, {
    ur: {hello: 'مسئلہ بتائیے۔ پاس کی کوئی پہچان بھی بتا سکتے ہیں۔ صحیح جگہ اگلے مرحلے میں نقشے پر چنیں۔', input: 'اپنا پیغام لکھیں', send: 'بھیجیں', review: 'نقشے پر جگہ چنیں', track: 'شکایت کی صورتحال دیکھیں', open: 'شکایت کھولیں', empty: 'کوئی متعلقہ شکایت نہیں ملی۔', error: 'چیٹ اس وقت دستیاب نہیں۔ شکایت فارم استعمال کریں۔', trackError: 'شکایت کی صورتحال نہیں ملی۔ پھر کوشش کریں۔', due: 'حل کی مدت'},
    ks: {hello: 'مسئلہ وَنِو۔ نَذدیکی نشان تہِ وَنِتھ ہٮ۪کِو۔ صحیح جاے اَگہِ مرحلہٕ منز نقشس پؠٹھ ژٲرِو۔', input: 'پنُن پٮ۪غام لکھِو', send: 'سوزِو', review: 'نقشس پؠٹھ جاے ژٲرِو', track: 'رپورٹُک حال وچھِو', open: 'رپورٹ کھولِو', empty: 'کانٛہہ متعلق رپورٹ لَبِ نہٕ۔', error: 'چیٹ وُنۍ دستیاب چھِ نہٕ۔', trackError: 'رپورٹُک حال لَبِ نہٕ۔ دُبارٕ کوشش کٔرِو۔', due: 'حلُک وقت'},
    doi: {hello: 'समस्या बताओ। नेड़े दा कोई निशान भी दस्स सकदे ओ। सही जगह अगले कदम च नक्शे पर चुनो।', input: 'अपना संदेश लिखो', send: 'भेजो', review: 'नक्शे पर जगह चुनो', track: 'शिकायत दा हाल देखो', open: 'शिकायत खोलो', empty: 'कोई मिलदी शिकायत नहीं मिली।', error: 'चैट इस वक्त उपलब्ध नहीं।', trackError: 'शिकायत दा हाल नहीं मिल्या। फेर कोशिश करो।', due: 'हल दी म्याद'},
  });
  const voiceStrings = localize(voiceCopy, language);
  const screenStrings = localize(screenCopy, language, {ur: urduScreen, ks: kashmiriScreen, doi: dogriScreen});
  const flow = localize(flowCopy, language, {ur: urduFlow, ks: kashmiriFlow, doi: dogriFlow});
  const interaction = localize(interactionCopy, language, {
    ur: {startingVoice: 'آواز شروع ہو رہی ہے…', connecting: 'مائیک تیار ہو رہا ہے…', processing: 'آپ کے الفاظ سمجھ رہے ہیں…', interrupt: 'بیچ میں بولنے کے لیے دبائیں', listening: 'آپ کی بات سن رہے ہیں', hint: 'آرام سے بولیں۔ بات پوری ہونے پر رک جائیں۔', review: 'سنے ہوئے الفاظ دیکھ کر بھیجیں، یا پھر بولیں۔', network: 'انٹرنیٹ دیکھیں، پھر مائیک دبائیں۔', language: 'یہ زبان دستیاب نہیں۔ دوسری زبان چنیں یا لکھیں۔', privacy: 'بات شروع کرنے پر ہی مائیک چلتا ہے۔'},
    ks: {startingVoice: 'آواز شروع گَژھان چھِ…', connecting: 'مائیک تیار گَژھان چھُ…', processing: 'تُہٕنٛدۍ لفظ سمجھان چھِ…', interrupt: 'درمیان بولنہٕ خٲطرٕ دبٲیو', listening: 'تُہٕنٛز بات بوزان چھِ', hint: 'آرام سان بولِو۔ بات پوری گَژھنہٕ پتہٕ رُکِو۔', review: 'بوزمُت لفظ وچھِو، یا دُبارٕ بولِو۔', network: 'انٹرنیٹ وچھِو، پتہٕ مائیک دبٲیو۔', language: 'یہ زبان دستیاب چھِ نہٕ۔', privacy: 'بات شروع کرنہٕ پتہٕ مائیک چلان چھُ۔'},
    doi: {startingVoice: 'आवाज शुरू होआ करदी ऐ…', connecting: 'माइक तैयार होआ करदा ऐ…', processing: 'तुहाडे शब्द समझे जा करदे न…', interrupt: 'बिच्च बोलन लेई दबाओ', listening: 'तुहाडी गल्ल सुनी जा करदी ऐ', hint: 'आराम नाल बोलो। गल्ल पूरी होन पर रुको।', review: 'सुने होए शब्द देख के भेजो, या फेर बोलो।', network: 'इंटरनेट देखो, फेर माइक दबाओ।', language: 'एह भाषा उपलब्ध नहीं।', privacy: 'गल्ल शुरू करन पर गै माइक चालदा ऐ।'},
  });
  const photoStrings = localize(photoCopy, language);
  const ux = localize(chatUxCopy, language, {ur: urduUx, ks: kashmiriUx, doi: dogriUx});
  const lastAssistant = messages.filter(message => message.role === 'assistant').slice(-1)[0];
  const lastReply = tracked ? statusLabel(tracked, language) : lastAssistant?.content;
  const lastSpeech = tracked ? (language === 'hinglish' ? hindiStatus[tracked.status] : statusLabel(tracked, language))
    : lastAssistant?.spokenReply ?? lastReply;

  const cancelTurn = useCallback(() => {
    focusId.current++;
    playbackId.current++;
    chatAbort.current?.abort();
    chatAbort.current = null;
    pending.current = false;
    voicePending.current = false;
    conversationActive.current = false;
    setConversation(false);
    setSpeaking(false);
    setStartingVoice(false);
    speechPlaying.current = false;
    setListening(false);
    setBusy(false);
    setOutgoing('');
    setMessages(conversationMessages.current);
    setPartial('');
    partialWords.current = '';
    setLevel(0);
    voice?.cancel();
  }, [voice]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
      cancelTurn();
      photoRun.current++;
      photoAbort.current?.abort();
      setAnalyzingPhoto(false);
    };
  }, [cancelTurn]));

  useEffect(() => {
    // Initialize synthesis while the citizen is reading or speaking, so the
    // first reply does not also wait for Android to bind its speech engine.
    if (voice?.prepare) void voice.prepare(playbackLocale[language]).catch(() => false);
  }, [voice, language]);

  useEffect(() => {
    const events = DeviceEventEmitter.addListener('ReportVoiceState', event => {
      if (event.type === 'cancelled') { cancelTurn(); return; }
      if (event.type === 'speech_started') {
        if (speechPlaying.current) setStartingVoice(false);
        return;
      }
      if (!voicePending.current) return;
      if (event.type === 'ready' || event.type === 'speech') setCaptureState('ready');
      if (event.type === 'processing') { setCaptureState('processing'); setLevel(0); }
      if (event.type === 'partial' && typeof event.text === 'string') {
        partialWords.current = event.text.slice(0, 500);
        setPartial(partialWords.current);
      }
      if (event.type === 'level' && typeof event.level === 'number') setLevel(event.level);
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'background') cancelTurn();
    });
    return () => { events.remove(); appState.remove(); };
  }, [cancelTurn]);

  useEffect(() => {
    if (!location || submission.current) return;
    if (gpsWanted.current || autoFile.current || (stage === 'location' && !pin)) {
      gpsWanted.current = false;
      setPin(location);
    }
  }, [location, stage, pin]);

  useEffect(() => {
    if (stage !== 'location' || !pin || !autoFile.current || submission.current || filing.current || speechPlaying.current) return;
    const timer = setTimeout(() => {
      if (!autoFile.current || submission.current || speechPlaying.current) return;
      autoFile.current = false;
      void submitRef.current(pin);
    }, 1200);
    return () => clearTimeout(timer);
  }, [stage, pin, speaking, fileTick]);

  useEffect(() => {
    if (stage !== 'location' || pin || submission.current) return;
    gpsWanted.current = true;
    refresh();
  }, [stage, pin, refresh]);

  useEffect(() => {
    if (autoFile.current && locationFailed.current && !speechPlaying.current && !submission.current) {
      setStage('location');
    }
  }, [locationError, location]);

  const speakReply = async (text: string, focus = focusId.current, replyLanguage = language) => {
    if (!voice || focusId.current !== focus || AppState.currentState === 'background') return false;
    const playback = ++playbackId.current;
    setSpeaking(true);
    setStartingVoice(true);
    speechPlaying.current = true;
    const spoken = await voice.speak(text, playbackLocale[replyLanguage]).catch(() => false);
    if (focusId.current === focus && playbackId.current === playback) {
      setSpeaking(false);
      setStartingVoice(false);
      speechPlaying.current = false;
      if (!spoken && !voicePending.current) setNotice(voiceStrings.playback);
    }
    return spoken;
  };

  const listen = async () => {
    if (!voice || voicePending.current || pending.current) return;
    voiceHeard.current = true;
    const focus = focusId.current;
    voicePending.current = true;
    setNotice('');
    Keyboard.dismiss();
    try {
      // Start the browser mic in this tap. An awaited permission check drops
      // Chrome's user-gesture and the microphone button then does nothing.
      const capturePromise = Platform.OS === 'web' ? voice.listen(speechLocale[language]) : null;
      const permission = capturePromise
        ? PermissionsAndroid.RESULTS.GRANTED
        : await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (focusId.current !== focus || !conversationActive.current) return;
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        conversationActive.current = false;
        setConversation(false);
        setNotice(voiceStrings.permission);
        return;
      }
      setListening(true);
      setCaptureState('connecting');
      setPartial('');
      partialWords.current = '';
      setLevel(0);
      const captured = await (capturePromise ?? voice.listen(speechLocale[language]));
      if (focusId.current !== focus || !conversationActive.current) return;
      const transcript = typeof captured === 'string' ? captured : captured?.text;
      if (transcript?.trim()) {
        const text = transcript.trim().slice(0, 500);
        voicePending.current = false;
        setListening(false);
        setInput(text);
        setTranscribed(false);
        if (typeof captured === 'object' && captured?.confidence != null && captured.confidence < 0.45) {
          conversationActive.current = false;
          setConversation(false);
          setTranscribed(true);
          setTyping(true);
          setNotice(interaction.review);
          return;
        }
        void request(false, text, true);
      } else {
        conversationActive.current = false;
        setConversation(false);
        if (partialWords.current.trim()) {
          setInput(partialWords.current.trim());
          setTranscribed(true);
          setTyping(true);
          setNotice(interaction.review);
        } else {
          setNotice(voiceStrings.missed);
        }
      }
    } catch (error) {
      if (focusId.current !== focus) return;
      conversationActive.current = false;
      setConversation(false);
      if (partialWords.current.trim()) {
        setInput(partialWords.current.trim());
        setTranscribed(true);
        setTyping(true);
      }
      const failure = error as {code?: string; message?: string};
      setNotice(failure.message
        ? failure.message
        : failure.code === 'VOICE_NETWORK' ? interaction.network
        : failure.code === 'VOICE_LANGUAGE' ? interaction.language
        : failure.code === 'VOICE_PERMISSION' ? voiceStrings.permission
        : voiceStrings.unavailable);
    } finally {
      if (focusId.current === focus) {
        voicePending.current = false;
        setListening(false);
        setPartial('');
        setLevel(0);
      }
    }
  };

  const request = async (tracking: boolean, spokenText?: string, voiceTurn = false, confirmedPhotoDraft?: Draft) => {
    const message = (spokenText ?? input).trim();
    if (pending.current || voicePending.current || (!tracking && !message)) return;
    if (speaking) {
      const active = conversationActive.current;
      cancelTurn();
      conversationActive.current = active;
      setConversation(active);
    }
    const focus = focusId.current;
    const reference = message.match(/\bcmp-[\da-f-]{36}\b/i)?.[0];
    const isTracking = tracking || !!reference || /\b(status|track)\b|स्थिति|स्टेटस/i.test(message);
    pending.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setChecking(isTracking);
    setOutgoing(isTracking ? '' : message);
    if (!isTracking) { setInput(''); setTranscribed(false); }
    setNotice('');
    setTracked(null);
    shouldScroll.current = true;
    let continueVoice = false;
    try {
      if (isTracking) {
        const complaints = await getMyComplaints();
        if (focusId.current !== focus) return;
        shouldScroll.current = true;
        setOutgoing('');
        const match = reference ? complaints.find(c => c._id === reference.toLowerCase()) : complaints[0];
        setTracked(match ?? null);
        if (!match) setNotice(strings.empty);
        if (match && (voiceTurn ? conversationActive.current : readAloud)) await speakReply(language === 'hinglish' ? hindiStatus[match.status] : statusLabel(match, language), focus);
      } else {
        const spokenLanguage = replyLanguage(message, language);
        if (spokenLanguage !== language) setLanguage(spokenLanguage);
        const next: Message[] = [...conversationMessages.current, {role: 'user', content: message}];
        conversationMessages.current = next;
        const controller = new AbortController();
        chatAbort.current = controller;
        const result = await post<{reply: string; spokenReply?: string; draft: Draft | null; askPhoto?: boolean; attachPhoto?: boolean}>('/ai/report-chat', {
          language: spokenLanguage,
          messages: next.slice(-12).map(({role, content}) => ({role, content})),
          hasPhoto: photos.length > 0,
          ...(confirmedPhotoDraft ? {confirmedPhotoDraft} : {}),
        }, {signal: controller.signal});
        if (focusId.current !== focus) return;
        shouldScroll.current = true;
        setOutgoing('');
        conversationMessages.current = [...next, {role: 'assistant', content: result.reply, spokenReply: result.spokenReply, language: spokenLanguage}];
        setMessages(conversationMessages.current);
        setDraft(result.draft);
        setEditing(false);
        setPhotoAsk(!!result.askPhoto && !result.draft);
        const filed = result.draft && !result.attachPhoto ? {
          reply: reviewReply[spokenLanguage],
          spokenReply: spokenReview[spokenLanguage],
        } : null;
        if (filed) {
          conversationMessages.current = [...next, {role: 'assistant', content: filed.reply, spokenReply: filed.spokenReply, language: spokenLanguage}];
          setMessages(conversationMessages.current);
        }
        setPin(null);
        const shouldSpeak = voiceTurn ? conversationActive.current : readAloud;
        if (shouldSpeak) voiceHeard.current = true;
        if (result.draft) {
          conversationActive.current = false;
          setConversation(false);
          setStage('location');
          autoFile.current = !result.attachPhoto;
          gpsWanted.current = true;
          refresh();
          pending.current = false;
          setBusy(false);
        }
        if (shouldSpeak) {
          const spoken = filed?.spokenReply ?? result.spokenReply ?? result.reply;
          if (voiceTurn || result.attachPhoto) {
            const heard = await speakReply(spoken, focus, spokenLanguage);
            continueVoice = heard && !result.draft && conversationActive.current;
          } else {
            // A typed turn must not lock the composer while a slow voice clip plays.
            void speakReply(spoken, focus, spokenLanguage);
          }
        }
        if (result.draft && locationRef.current && focusId.current === focus) setPin(locationRef.current);
        if (result.draft && result.attachPhoto && focusId.current === focus) void attachThenFile();
      }
      if (focusId.current !== focus) return;
      if (!tracking) {
        setInput('');
        setTranscribed(false);
      }
    } catch {
      if (focusId.current !== focus) return;
      setMessages(conversationMessages.current);
      conversationActive.current = false;
      setConversation(false);
      setNotice(isTracking ? strings.trackError : strings.error);
      if (!isTracking) { setInput(message); setTyping(true); }
    } finally {
      if (focusId.current === focus) {
        chatAbort.current = null;
        pending.current = false;
        setOutgoing('');
        setBusy(false);
        if (continueVoice && conversationActive.current) {
          void listen();
        } else if (voiceTurn) {
          conversationActive.current = false;
          setConversation(false);
        }
      }
    }
  };

  const stopConversation = () => {
    cancelTurn();
  };
  const showIntro = messages.length === 0 && photos.length === 0 && !tracked && !busy && stage === 'talk';
  const avatarMood: AvatarMood = speaking && !startingVoice ? 'speaking'
    : listening && captureState === 'processing' ? 'thinking'
    : listening ? 'listening'
    : busy || startingVoice ? 'thinking'
    : 'idle';
  const micLabel = listening ? voiceStrings.finish : busy || speaking ? interaction.interrupt : flow.start;
  const toggleMic = () => {
    if (listening) { voice?.stopListening(); return; }
    cancelTurn();
    setStage('talk');
    conversationActive.current = true;
    setConversation(true);
    setReadAloud(true);
    void listen();
  };
  const changePhotos = async (next: PhotoItem[], locale = language) => {
    const run = ++photoRun.current;
    photoAbort.current?.abort();
    setPhotos(next);
    setPhotoResult(null);
    setPhotoApproved(null);
    setPhotoError(false);
    setAnalyzingPhoto(false);
    if (!next[0]) return;
    if (!next[0].base64) { setPhotoError(true); return; }
    const controller = new AbortController();
    photoAbort.current = controller;
    setAnalyzingPhoto(true);
    try {
      const result = await classifyPhoto(next[0].base64, locale, controller.signal);
      if (run !== photoRun.current) return;
      setPhotoResult(result);
      shouldScroll.current = true;
      if (readAloudEnabled.current && !pending.current && !voicePending.current && !speechPlaying.current) {
        void speakReply(result.spokenSummary, focusId.current, locale);
      }
    } catch {
      if (run === photoRun.current) setPhotoError(true);
    } finally {
      if (run === photoRun.current) { setAnalyzingPhoto(false); photoAbort.current = null; }
    }
  };
  const usePhotoDescription = () => {
    if (!photoResult || photoResult.status !== 'issue_visible' || photoResult.confidence !== 'high') return;
    const replace = !!draft && draft.category !== photoResult.category;
    cancelTurn();
    setPhotoApproved(photoResult);
    setStage('talk');
    void request(false, (replace ? photoStrings.replaceRequest : photoStrings.request) + ' ' + photoResult.summary, false, {
      title: photoResult.title, description: photoResult.summary, category: photoResult.category,
    });
  };
  const addPhoto = async () => {
    const words = partialWords.current;
    cancelTurn();
    if (words.trim()) { setInput(words.trim()); setTyping(true); }
    try {
      const selected = await chooseReportPhoto();
      if (selected && focused.current) await changePhotos([selected]);
    } catch {
      if (focused.current) setNotice(photoStrings.failed);
    }
  };
  const attachThenFile = async () => {
    try {
      const selected = await chooseReportPhoto();
      if (selected && focused.current) void changePhotos([selected]);
    } catch {
      if (focused.current) setNotice(photoStrings.failed);
    }
    if (!focused.current) return;
    autoFile.current = true;
    setFileTick(tick => tick + 1);
  };
  const startTyping = () => {
    const words = partialWords.current;
    cancelTurn();
    if (words.trim()) setInput(current => current || words.trim());
    setTyping(true);
  };
  const submit = async (coords?: Coordinates) => {
    const place = coords ?? locationRef.current ?? pin;
    if (!draft?.title.trim() || !draft.description.trim() || !place || pending.current || submitting || submitted || filing.current) return;
    filing.current = true;
    if (!submission.current) {
      submission.current = {
        data: {
          ...draft, title: draft.title.trim(), description: draft.description.trim(), language, location: place,
          aiCategory: photoApproved?.category === draft.category ? photoApproved.category : undefined,
          aiSummary: photoApproved?.category === draft.category ? photoApproved.summary : undefined,
          originalReport: messages.filter(message => message.role === 'user').map(message => message.content).join('\n'),
          clientRequestId: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2).padEnd(10, '0') + '-' + Math.random().toString(36).slice(2).padEnd(10, '0'),
        },
        photos: [...photos],
      };
    }
    cancelTurn();
    photoRun.current++;
    photoAbort.current?.abort();
    setAnalyzingPhoto(false);
    pending.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    setNotice('');
    try {
      const saved = await createComplaintWithMedia(submission.current.data, submission.current.photos);
      setSubmitted(saved);
      setStage('submitted');
      shouldScroll.current = true;
      if (voiceHeard.current || readAloud) {
        const problem = String(saved.title || '').replace(/\s+/g, ' ').trim();
        const who = saved.workerName ? flow.assigned + ' ' + saved.workerName : flow.waiting;
        await speakReply([flow.submitted, problem, who].filter(Boolean).join('. '));
      }
    } catch {
      filing.current = false;
      setSubmitFailed(true);
      setNotice(flow.failed);
      setStage('location');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  submitRef.current = submit;
  const userBubble = (content: string, key?: number) => (
    <View key={key} style={[styles.bubble, styles.sent, {backgroundColor: colors.primarySoft}]}>
      <Text color={colors.text} style={[styles.userText, script, rtl ? styles.rtl : undefined]}>{content}</Text>
    </View>
  );
  // Legal Setu's assistant bubble: large readable text with its own "listen again" control.
  const assistantBubble = (key: string | number, content: string, spoken: string, spokenLanguage: Language) => (
    <View key={key} style={[styles.bubble, styles.received, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <Text color={colors.text} style={[styles.assistantText, script, rtl ? styles.rtl : undefined]}>{content}</Text>
      {voice ? (
        <Pressable accessibilityRole="button" accessibilityLabel={voiceStrings.replay} disabled={listening}
          onPress={() => { stopConversation(); void speakReply(spoken, focusId.current, spokenLanguage); }}
          style={[styles.row, styles.listenAgain]}>
          <AppIcon name="volume" size={22} color={colors.primary} />
          <Text variant="label" color={colors.primary}>{voiceStrings.replay}</Text>
        </Pressable>
      ) : null}
    </View>
  );
  const statusLine = listening
    ? captureState === 'connecting' ? interaction.connecting : captureState === 'processing' ? interaction.processing : interaction.listening
    : speaking ? startingVoice ? interaction.startingVoice : flow.speaking
    : busy ? checking ? screenStrings.checking : screenStrings.thinking
    : ux.tap;

  return (
    <View style={styles.screen}>
      <Header title="Setu Assistant" subtitle={stage === 'location' ? flow.mapStep : stage === 'submitted' ? flow.done : ux.ready}
        onBack={() => {
          if (stage === 'location' && !submission.current) { cancelTurn(); setStage('talk'); }
          else onBack();
        }}
        rightAction={(
          <View style={styles.row}>
            {voice ? (
              <Pressable accessibilityRole="switch" accessibilityLabel={voiceStrings.read}
                accessibilityState={{checked: readAloud}} disabled={listening || busy || submitting}
                onPress={() => {
                  if (readAloud) cancelTurn();
                  setReadAloud(!readAloud);
                }}
                style={[styles.iconButton, {backgroundColor: readAloud ? colors.primarySoft : colors.background}]}>
                <AppIcon name={readAloud ? 'volume' : 'volume-off'} size={21} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        )} />
      <View style={{paddingTop: spacing.sm}}>
        {stage !== 'submitted' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.languages, {paddingHorizontal: spacing.lg}, desktop && styles.languagesDesktop]}>
          {options.map(option => {
            const active = option.value === language;
            const optionScript = option.value === 'en' || option.value === 'hinglish' ? undefined : scriptFont;
            return (
              <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label}
                accessibilityState={{selected: active}}
                onPress={() => {
                  if (busy || voicePending.current || submitting || submission.current || option.value === language) return;
                  cancelTurn();
                  setNotice('');
                  const next = option.value as Language;
                  setLanguage(next);
                  if (photos.length) void changePhotos(photos, next);
                  void speakReply(voiceGreeting[next], focusId.current, next);
                }}
                style={[styles.language, desktop && styles.languageDesktop, {backgroundColor: active ? colors.primaryDark : colors.surface, borderColor: active ? colors.primaryDark : colors.border}]}>
                <Text variant="bodySmall" color={active ? colors.white : colors.text} style={[styles.languageLabel, optionScript]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        ) : null}
      </View>
      {voice && stage === 'talk' ? (
        <View style={styles.stage}>
          <Pressable accessible={speaking} accessibilityRole="button" accessibilityLabel={speaking ? interaction.interrupt : undefined}
            disabled={!speaking} onPress={() => cancelTurn()}>
            <SetuAvatar mood={avatarMood} level={listening ? level : 0} size={typing ? 76 : 132} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView ref={thread} style={styles.screen} contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (shouldScroll.current) {
            shouldScroll.current = false;
            if (stage === 'talk') thread.current?.scrollToEnd({animated: true});
            else thread.current?.scrollTo({y: 0, animated: false});
          }
        }}>
        {showIntro ? (
          <>
            {assistantBubble('greeting', `${screenStrings.prompt} ${ux.intro}`, `${screenStrings.prompt} ${ux.intro}`, language)}
            {!listening ? (
              <Pressable accessibilityRole="button"
                onPress={() => { setInput(screenStrings.example); setTranscribed(false); setTyping(true); }}
                style={[styles.example, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                <Text variant="bodySmall" style={script}>“{screenStrings.example}”</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        {stage === 'talk' ? messages.map((message, index) => message.role === 'user'
          ? userBubble(message.content, index)
          : assistantBubble(index, message.content, message.spokenReply ?? message.content, message.language ?? language)) : null}
        {photoAsk && !busy && !listening && stage === 'talk' ? (
          <View style={[styles.row, styles.answers]}>
            {([['yes', 'camera'], ['no', 'check']] as const).map(([answer, icon]) => (
              <Pressable key={answer} accessibilityRole="button" accessibilityLabel={photoAnswers[language][answer]}
                onPress={() => { setPhotoAsk(false); void request(false, photoAnswers[language][answer]); }}
                style={[styles.row, styles.answer, {borderColor: colors.primary, backgroundColor: answer === 'yes' ? colors.primarySoft : colors.surface}]}>
                <AppIcon name={icon} size={20} color={colors.primary} />
                <Text variant="label" color={colors.primary} style={script}>{photoAnswers[language][answer]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {outgoing && stage === 'talk' ? userBubble(outgoing) : null}
        {busy && stage === 'talk' ? (
          <View style={[styles.bubble, styles.received, styles.row, {backgroundColor: colors.surface, borderColor: colors.border}]} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color={colors.textSecondary} style={script}>{checking ? screenStrings.checking : screenStrings.thinking}</Text>
          </View>
        ) : null}
        {draft && !busy && stage === 'location' ? (
          <Card style={{gap: 6, borderColor: colors.primary}}>
            <View style={styles.row}>
              <AppIcon name="check-circle" size={18} color={colors.primary} />
              <Text variant="label" color={colors.primary}>{ux.review}</Text>
            </View>
            {editing ? (
              <>
                <Text variant="caption">{ux.title}</Text>
                <TextInput accessibilityLabel={ux.title} value={draft.title} maxLength={100}
                  onChangeText={title => setDraft(current => current ? {...current, title} : current)}
                  style={[styles.reviewInput, {color: colors.text, borderColor: colors.border}]} />
                <Text variant="caption">{ux.details}</Text>
                <TextInput accessibilityLabel={ux.details} value={draft.description} maxLength={500} multiline
                  onChangeText={description => setDraft(current => current ? {...current, description} : current)}
                  style={[styles.reviewInput, {minHeight: 80, color: colors.text, borderColor: colors.border}]} />
              </>
            ) : <Text variant="subtitle">{draft.title}</Text>}
            <Text variant="caption">{CATEGORY_META[draft.category]?.label}</Text>
            {!editing ? <Text variant="bodySmall">{draft.description}</Text> : null}
            {!submission.current ? <Button title={editing ? ux.save : ux.edit} variant="ghost" size="sm" onPress={() => setEditing(!editing)} /> : null}
          </Card>
        ) : null}
        {stage === 'location' && draft ? (
          <Card style={{gap: 10}}>
            <Text variant="h3">{flow.map}</Text>
            <Text variant="bodySmall">{locationError ? 'Your location could not be read. Tap the spot, or try GPS again.' : flow.mapHint}</Text>
            <View pointerEvents={submission.current ? 'none' : 'auto'}>
              <LocationPicker value={pin} onChange={(coords: Coordinates) => {
                gpsWanted.current = false;
                setPin(coords);
              }} height={240} />
            </View>
            <Button title={locating ? 'GPS…' : flow.gps} variant="outline" loading={locating}
              disabled={!!submission.current || busy}
              icon={<AppIcon name="navigation" size={18} color={colors.primary} />}
              onPress={() => { gpsWanted.current = true; refresh(); }} />
            {locationError ? <Text variant="caption" color={colors.error}>{locationError}</Text> : null}
            {pin ? <Text variant="caption" color={colors.primary}>{flow.selected}</Text> : null}
            {!photos.length && !submission.current ? <Button title={ux.photo} variant="outline" onPress={addPhoto}
              icon={<AppIcon name="camera" size={18} color={colors.primary} />} /> : null}
            {!submission.current ? (
              <>
                <Button title={flow.change} variant="ghost" disabled={busy}
                  onPress={() => { stopConversation(); setStage('talk'); setPin(null); }} />
              </>
            ) : null}
          </Card>
        ) : null}
        {stage !== 'submitted' && !submission.current && photos.length > 0 ? (
          <Card style={{gap: 10}}>
            <View style={styles.row}>
              <AppIcon name="camera" size={20} color={colors.primary} />
              <Text variant="h3">{photoStrings.suggestion}</Text>
            </View>
            <PhotoPickerGrid photos={photos} onChange={next => { void changePhotos(next); }} maxPhotos={1}
              addLabel={ux.photo} removeLabel={photoStrings.remove} />
            {analyzingPhoto ? (
              <View style={styles.row} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="bodySmall">{photoStrings.analyzing}</Text>
              </View>
            ) : null}
            {photoResult && !(stage === 'location' && photoApproved === photoResult) ? (
              <>
                <Text>{photoResult.summary || photoResult.message}</Text>
                {photoResult.status === 'issue_visible' && photoResult.confidence === 'high' ? (
                  <>
                    <Text variant="caption">{CATEGORY_META[photoResult.category]?.label}</Text>
                    <Text variant="caption">{photoApproved === photoResult ? photoStrings.applied : draft ? photoStrings.keep : photoStrings.review}</Text>
                    <Button title={draft && draft.category !== photoResult.category ? photoStrings.replace : photoStrings.apply}
                      variant="outline" disabled={busy || listening || photoApproved === photoResult}
                      onPress={usePhotoDescription} />
                  </>
                ) : null}
                {voice ? <Button title={photoStrings.hear} variant="ghost" size="sm" disabled={listening || busy}
                  onPress={() => { cancelTurn(); void speakReply(photoResult.spokenSummary); }} /> : null}
              </>
            ) : null}
            {photoResult && stage === 'location' && photoApproved === photoResult ? <Text variant="caption">{photoStrings.attached}</Text> : null}
            {photoError ? <Text variant="caption" accessibilityLiveRegion="polite">{photoStrings.failed}</Text> : null}
            {photos.length && !analyzingPhoto && (photoError || (photoResult && photoResult.status !== 'issue_visible')) ? (
              <Button title={photoStrings.retry} variant="ghost" size="sm" onPress={() => { void changePhotos(photos); }} />
            ) : null}
          </Card>
        ) : null}
        {submitted ? (
          <Card style={{gap: 8, borderColor: colors.success}}>
            <View style={styles.row}>
              <AppIcon name="check-circle" size={22} color={colors.success} />
              <Text variant="h3">{flow.submitted}</Text>
            </View>
            <Text variant="subtitle">{submitted.title}</Text>
            <Text selectable variant="caption">{submitted._id}</Text>
            <Text>{submitted.workerName ? flow.assigned + ' ' + submitted.workerName : flow.waiting}</Text>
            <MiniMap location={submitted.location} height={220} />
            <ComplaintOwnership complaint={submitted} />
          </Card>
        ) : null}
        {tracked ? (
          <Card style={{gap: 6}}>
            <Text variant="label">{tracked.title}</Text>
            <Text>{statusLabel(tracked, language)}</Text>
            {tracked.resolutionDueAt && !['resolved', 'closed', 'rejected'].includes(tracked.status) ? (
              <Text>{strings.due} · {formatDateTime(tracked.resolutionDueAt)}</Text>
            ) : null}
            <Button title={strings.open} onPress={() => onTrack(tracked._id)} variant="outline" />
          </Card>
        ) : null}
        {tracked && voice && !busy && !speaking && stage === 'talk' && lastSpeech ? (
          <Pressable accessibilityRole="button" accessibilityLabel={voiceStrings.replay} disabled={listening}
            onPress={() => { stopConversation(); void speakReply(lastSpeech, focusId.current, language); }} style={[styles.row, styles.smallAction]}>
            <AppIcon name="volume" size={20} color={colors.primary} />
            <Text variant="label" color={colors.primary}>{voiceStrings.replay}</Text>
          </Pressable>
        ) : null}
        {showIntro ? (
          <Pressable accessibilityRole="button" disabled={listening}
            onPress={() => request(true)} style={[styles.row, styles.smallAction, {alignSelf: 'center'}]}>
            <AppIcon name="clock" size={17} color={colors.primary} />
            <Text variant="caption" color={colors.primary}>{strings.track}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, {backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(12, bottomInset)}]}>
        {stage === 'talk' && draft && !submitted ? (
          <Button title={flow.submitting} loading disabled />
        ) : null}
        {stage === 'location' ? (
          <Button title={submitting ? flow.submitting : submitFailed ? flow.retry : pin ? flow.submit : flow.choose}
            disabled={!pin || !draft?.title.trim() || !draft.description.trim() || busy || submitting} loading={submitting}
            icon={<AppIcon name="check-circle" size={19} color={colors.white} />} onPress={submit} />
        ) : null}
        {submitted ? (
          <Button title={flow.view} onPress={() => onTrack(submitted._id)} />
        ) : null}
        {notice ? <View style={[styles.notice, {backgroundColor: colors.background}]}>
          <Text variant="caption" accessibilityLiveRegion="polite">{notice}</Text>
        </View> : null}
        {transcribed && !listening ? <Text variant="caption">{interaction.review}</Text> : null}
        {stage === 'talk' && (typing || !voice) ? (
        <View style={[styles.row, styles.typeRow]}>
          {voice ? (
            <Pressable accessibilityRole="button" accessibilityLabel={ux.voice}
              onPress={() => { Keyboard.dismiss(); setTyping(false); }} style={styles.dockIcon}>
              <AppIcon name="mic" size={26} color={colors.text} />
            </Pressable>
          ) : null}
          <TextInput placeholder={strings.input} accessibilityLabel={strings.input} value={input}
            onChangeText={setInput} editable={!listening} maxLength={500} multiline
            placeholderTextColor={colors.textSecondary} style={[styles.input, script, {color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg}]} />
          <Pressable accessibilityRole="button" accessibilityLabel={strings.send}
            disabled={busy || !input.trim() || listening} onPress={() => request(false)}
            style={[styles.iconButton, {backgroundColor: !busy && input.trim() && !listening ? colors.primaryDark : colors.primarySoft}]}>
            <AppIcon name="arrow-up" size={22} color={!busy && input.trim() && !listening ? colors.white : colors.textSecondary} />
          </Pressable>
        </View>
        ) : null}
        {stage === 'talk' && voice && !typing ? (
          <>
            <View style={styles.micRow}>
              <View style={styles.dockSideSlot}>
                <Pressable accessibilityRole="button" accessibilityLabel={ux.photo} onPress={addPhoto} style={styles.dockIcon}>
                  <AppIcon name="camera" size={26} color={colors.text} />
                  <Text variant="caption" color={colors.text} numberOfLines={1} style={[styles.dockLabel, script]}>{ux.photo}</Text>
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={micLabel} accessibilityState={{busy: busy && !speaking}}
                onPress={toggleMic}
                style={({pressed}) => [styles.bigMic, {backgroundColor: listening ? colors.error : colors.primaryDark, opacity: pressed ? 0.85 : 1}]}>
                <AppIcon name={listening ? 'square' : busy && !speaking ? 'clock' : 'mic'} size={44} color={colors.white} />
              </Pressable>
              <View style={styles.dockSideSlot}>
                <Pressable accessibilityRole="button" accessibilityLabel={ux.type} onPress={startTyping} style={styles.dockIcon}>
                  <AppIcon name="pencil" size={26} color={colors.text} />
                  <Text variant="caption" color={colors.text} numberOfLines={1} style={[styles.dockLabel, script]}>{ux.type}</Text>
                </Pressable>
              </View>
            </View>
            <Text variant="subtitle" center color={colors.text} style={[styles.micLabel, script]} accessibilityLiveRegion="polite">{statusLine}</Text>
            {listening && partial ? <Text variant="bodySmall" center numberOfLines={2} style={script}>{partial}</Text> : null}
            {conversation || speaking || busy ? (
              <View style={styles.row}>
                {(speaking || busy) && !submitting ? (
                  <View style={{flex: 1}}><Button title={interaction.interrupt} variant="outline" size="sm" onPress={toggleMic} /></View>
                ) : null}
                <View style={{flex: 1}}><Button title={flow.stop} variant="ghost" size="sm" onPress={stopConversation} /></View>
              </View>
            ) : null}
          </>
        ) : null}
        {stage !== 'talk' && voice && (speaking || listening) ? (
          <View style={[styles.row, {justifyContent: 'center'}]}>
            <AppIcon name="volume" size={18} color={colors.primary} />
            <Text variant="label" color={colors.primary} style={script} accessibilityLiveRegion="polite">{statusLine}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, minHeight: 0},
  thread: {padding: 16, gap: 14},
  stage: {alignItems: 'center', paddingTop: 4, paddingBottom: 4},
  languagesDesktop: {justifyContent: 'flex-start'},
  languageDesktop: {minWidth: 108},
  languageLabel: {fontSize: 16, lineHeight: 26},
  rtl: {textAlign: 'right', writingDirection: 'rtl'},
  languages: {flexDirection: 'row', gap: 8, paddingBottom: 8},
  language: {minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  example: {alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1},
  bubble: {maxWidth: '92%', alignSelf: 'flex-start', padding: 16, borderRadius: 20, gap: 8},
  received: {borderWidth: 1, borderTopLeftRadius: 6},
  sent: {alignSelf: 'flex-end', maxWidth: '85%', borderTopRightRadius: 6},
  assistantText: {fontSize: 21, lineHeight: 31},
  userText: {fontSize: 18, lineHeight: 26},
  listenAgain: {alignSelf: 'flex-start', minHeight: 40},
  answers: {flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10},
  answer: {minHeight: 52, paddingHorizontal: 18, borderRadius: 26, borderWidth: 2},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  strong: {fontWeight: '700'},
  smallAction: {minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 4},
  composer: {flexShrink: 0, width: '100%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, gap: 8},
  micRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  dockSideSlot: {width: 76, alignItems: 'center'},
  dockIcon: {minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2},
  dockLabel: {textAlign: 'center'},
  bigMic: {width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', elevation: 4},
  micLabel: {fontWeight: '700'},
  typeRow: {gap: 10},
  reviewInput: {fontSize: 16, padding: 10, borderRadius: 12, borderWidth: 1, textAlignVertical: 'top'},
  notice: {borderRadius: 12, padding: 10},
  iconButton: {width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center'},
  input: {flex: 1, minWidth: 0, minHeight: 56, maxHeight: 120, borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 19},
});
