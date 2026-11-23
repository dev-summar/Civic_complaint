import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform} from 'react-native';

const mockVoice = {
  prepare: jest.fn().mockResolvedValue(true),
  listen: jest.fn(),
  speak: jest.fn().mockResolvedValue(true),
  cancel: jest.fn(),
  stopListening: jest.fn(),
};
NativeModules.ReportVoice = mockVoice;
Object.defineProperty(Platform, 'OS', {value: 'android'});
jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
const mockPost = jest.fn();
const mockCreate = jest.fn();
const mockRefresh = jest.fn();
const mockTracked = jest.fn().mockResolvedValue([]);
const mockClassify = jest.fn();
const mockChoosePhoto = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, []),
}));
jest.mock('react-native-gesture-handler', () => ({
  TouchableOpacity: require('react-native').TouchableOpacity,
  Pressable: require('react-native').Pressable,
}));
jest.mock('../src/services/api', () => ({post: (...args: unknown[]) => mockPost(...args)}));
jest.mock('../src/services/complaint.service', () => ({
  createComplaintWithMedia: (...args: unknown[]) => mockCreate(...args),
  getMyComplaints: (...args: unknown[]) => mockTracked(...args),
}));
jest.mock('../src/services/engagement.service', () => ({classifyPhoto: (...args: unknown[]) => mockClassify(...args)}));
jest.mock('../src/utils/photo', () => ({chooseReportPhoto: () => mockChoosePhoto()}));
jest.mock('../src/hooks/useLocation', () => ({
  useLocation: () => ({location: null, refresh: mockRefresh, isLoading: false, error: null}),
}));
jest.mock('../src/theme', () => ({
  useTheme: () => ({colors: {primary: '#123', primaryDark: '#123', surface: '#fff', text: '#111', white: '#fff', border: '#ddd'}, spacing: {lg: 16, sm: 8}}),
}));
jest.mock('../src/constants', () => ({CATEGORY_META: {sewage_overflow: {label: 'Drainage'}}}));
jest.mock('../src/utils/format', () => ({formatDateTime: (v: string) => v, formatStatus: (v: string) => v}));
jest.mock('../src/components/maps', () => ({
  LocationPicker: (props: object) => require('react').createElement('Map', props),
}));
jest.mock('../src/components/complaints/PhotoPickerGrid', () => ({
  PhotoPickerGrid: (props: object) => require('react').createElement('PhotoPicker', props),
}));
jest.mock('../src/components/complaints/ComplaintOwnership', () => ({
  ComplaintOwnership: (props: object) => require('react').createElement('Ownership', props),
}));
jest.mock('../src/components/ui', () => {
  const react = require('react');
  const element = (name: string) => ({children, ...props}: any) => react.createElement(name, props, children);
  return Object.fromEntries(['AppIcon', 'Button', 'Card', 'Header', 'SegmentedControl', 'Text'].map(name => [name, element(name)]));
});

const {ReportChat} = require('../src/components/complaints/ReportChat');
const draft = {title: 'Overflowing drain', description: 'Drain overflow near a school.', category: 'sewage_overflow'};
const saved = {...draft, _id: 'cmp-verified', status: 'assigned', workerName: 'Drainage Worker', resolutionDueAt: '2026-11-06T10:00:00Z'};
let tree: renderer.ReactTestRenderer;

async function settle() {
  await new Promise<void>(resolve => setImmediate(resolve));
}

function control(label: string) {
  return tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
}

function button(title: string) {
  return tree.root.findAll(node => node.type === 'Button' && node.props.title === title)[0];
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockPost.mockReset();
  mockVoice.listen.mockReset();
  mockCreate.mockReset();
  mockClassify.mockReset();
  mockChoosePhoto.mockReset();
  mockVoice.speak.mockResolvedValue(true);
  mockVoice.prepare.mockResolvedValue(true);
  mockCreate.mockResolvedValue(saved);
  await act(async () => {
    tree = renderer.create(<ReportChat initialLanguage="en" onBack={jest.fn()} onTrack={jest.fn()} />);
    await settle();
  });
});

const photo = {uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg', base64: 'photo-bytes'};
const litter = {status: 'issue_visible', confidence: 'high', category: 'garbage', priority: 'low', title: 'Discarded bottle', summary: 'A discarded bottle is lying in grass.', spokenSummary: 'A discarded bottle is lying in grass.', evidence: 'Bottle in grass beside a wall.'};

function selectPhoto(next: object[]) {
  const picker = tree.root.findAllByType('PhotoPicker')[0];
  if (picker) return picker.props.onChange(next);
  mockChoosePhoto.mockResolvedValueOnce(next[0] || null);
  const add = button('Add photo') || control('Add photo');
  return add.props.onPress();
}

it('creates a photo-based conversational draft only after review, then submits its confirmed photo evidence', async () => {
  const photoDraft = {title: litter.title, description: litter.summary, category: 'garbage'};
  mockClassify.mockResolvedValueOnce(litter);
  mockPost.mockResolvedValueOnce({reply: 'Check the location.', draft: photoDraft});
  await act(async () => { selectPhoto([photo]); await settle(); });
  expect(mockClassify).toHaveBeenCalledWith('photo-bytes', 'en', expect.any(AbortSignal));
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
  await act(async () => { button('Hear photo description').props.onPress(); await settle(); });
  expect(mockVoice.speak).toHaveBeenLastCalledWith(litter.spokenSummary, 'en-IN');
  await act(async () => { button('Use photo description').props.onPress(); await settle(); });
  expect(mockPost.mock.calls[0][1].messages[0].content).toContain(litter.summary);
  expect(mockPost.mock.calls[0][1].messages[0].content).not.toContain('photo-bytes');
  expect(mockPost.mock.calls[0][1].confirmedPhotoDraft).toEqual(photoDraft);
  expect(mockCreate).not.toHaveBeenCalled();
  await act(async () => { tree.root.findByType('Map').props.onChange({latitude: 32.7, longitude: 74.8}); await settle(); });
  await act(async () => { button('Confirm location & submit').props.onPress(); await settle(); });
  expect(mockCreate.mock.calls[0][0]).toMatchObject({...photoDraft, aiCategory: 'garbage', aiSummary: litter.summary});
  expect(mockCreate.mock.calls[0][1]).toEqual([photo]);
});

it('keeps a spoken complaint intact when the photo suggests a different issue until the citizen chooses replacement', async () => {
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft})
    .mockResolvedValueOnce({reply: 'Check the updated draft.', draft: {title: litter.title, description: litter.summary, category: 'garbage'}});
  mockClassify.mockResolvedValueOnce(litter);
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { selectPhoto([photo]); await settle(); });
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(tree.root.findAll(node => node.type === 'Text' && node.props.children === draft.title)).toHaveLength(1);
  expect(mockVoice.speak).toHaveBeenLastCalledWith(litter.spokenSummary, 'en-IN');
  await act(async () => { button('Use photo description instead').props.onPress(); await settle(); });
  expect(mockPost.mock.calls[1][1].messages.slice(-1)[0].content).toMatch(/^Replace my previous complaint/);
  expect(tree.root.findAll(node => node.type === 'Text' && node.props.children === litter.title)).toHaveLength(1);
});

it('does not offer a complaint draft for unrelated or uncertain photos', async () => {
  mockClassify.mockResolvedValueOnce({...litter, status: 'no_clear_issue', category: 'others', title: '', summary: '', message: 'No clear civic issue is visible.', spokenSummary: 'No clear civic issue is visible.'});
  await act(async () => { selectPhoto([photo]); await settle(); });
  expect(button('Use photo description')).toBeUndefined();
  expect(mockPost).not.toHaveBeenCalled();
  expect(tree.root.findAllByType('Map')).toHaveLength(0);
  expect(button('Analyze photo again')).toBeDefined();
});

it('ignores a removed photo response and keeps only the replacement photo assessment', async () => {
  let finishOld: (result: object) => void = () => {};
  mockClassify.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({...litter, summary: 'A plastic wrapper is on the road.'});
  await act(async () => { selectPhoto([photo]); await settle(); });
  const oldSignal = mockClassify.mock.calls[0][2];
  await act(async () => { selectPhoto([]); await settle(); });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { selectPhoto([{...photo, uri: 'file:///new.jpg', base64: 'new-bytes'}]); await settle(); });
  await act(async () => { finishOld({...litter, summary: 'Outdated photo result'}); await settle(); });
  expect(tree.root.findAll(node => node.type === 'Text' && node.props.children === 'Outdated photo result')).toHaveLength(0);
  expect(tree.root.findAll(node => node.type === 'Text' && node.props.children === 'A plastic wrapper is on the road.')).toHaveLength(1);
});

it('shows photo failures and supports a retry without inventing a description', async () => {
  mockClassify.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(litter);
  await act(async () => { selectPhoto([photo]); await settle(); });
  expect(button('Use photo description')).toBeUndefined();
  expect(mockPost).not.toHaveBeenCalled();
  await act(async () => { button('Analyze photo again').props.onPress(); await settle(); });
  expect(button('Use photo description')).toBeDefined();
});

it('changes photo-analysis language and ignores the old language result', async () => {
  let finishEnglish: (result: object) => void = () => {};
  mockClassify.mockImplementationOnce(() => new Promise(resolve => { finishEnglish = resolve; }))
    .mockResolvedValueOnce({...litter, summary: 'घास पर बोतल पड़ी है।', spokenSummary: 'घास पर बोतल पड़ी है।'});
  await act(async () => { selectPhoto([photo]); await settle(); });
  await act(async () => { tree.root.findByType('SegmentedControl').props.onChange('hi'); await settle(); });
  expect(mockClassify.mock.calls[0][2].aborted).toBe(true);
  expect(mockClassify.mock.calls[1][1]).toBe('hi');
  await act(async () => { finishEnglish(litter); await settle(); });
  await act(async () => { button('फ़ोटो का विवरण सुनें').props.onPress(); await settle(); });
  expect(mockVoice.speak).toHaveBeenLastCalledWith('घास पर बोतल पड़ी है।', 'hi-IN');
});

it('cancels pending photo analysis when submitting so a late photo cannot interrupt confirmation', async () => {
  let finishPhoto: (result: object) => void = () => {};
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft});
  mockClassify.mockImplementationOnce(() => new Promise(resolve => { finishPhoto = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { selectPhoto([photo]); await settle(); });
  await act(async () => { tree.root.findByType('Map').props.onChange({latitude: 32.7, longitude: 74.8}); await settle(); });
  await act(async () => { button('Confirm location & submit').props.onPress(); await settle(); });
  expect(mockClassify.mock.calls[0][2].aborted).toBe(true);
  await act(async () => { finishPhoto(litter); await settle(); });
  expect(mockVoice.speak).toHaveBeenCalledTimes(2);
  expect(mockVoice.speak).toHaveBeenLastCalledWith('Complaint submitted. Assigned to Drainage Worker', 'en-IN');
  expect(mockCreate.mock.calls[0][0].aiSummary).toBeUndefined();
});

afterEach(async () => {
  await act(async () => { tree.unmount(); await settle(); });
});

it('keeps voice context, speaks the final draft, opens the map, and files only after pin confirmation', async () => {
  mockVoice.listen.mockResolvedValueOnce('There is a problem.').mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'What is the problem?', draft: null})
    .mockResolvedValueOnce({reply: 'Your draft is ready. Choose the location.', draft});
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); await settle(); });
  expect(mockVoice.listen).toHaveBeenCalledTimes(2);
  expect(mockVoice.speak.mock.calls.map(call => call[0])).toEqual(['What is the problem?', 'Your draft is ready. Choose the location.']);
  expect(mockPost.mock.calls[1][1].messages).toEqual([
    {role: 'user', content: 'There is a problem.'},
    {role: 'assistant', content: 'What is the problem?'},
    {role: 'user', content: 'The drain is overflowing.'},
  ]);
  expect(tree.root.findByType('Map').props.value).toBeNull();
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(button('Select a location to submit').props.disabled).toBe(true);
  await act(async () => {
    tree.root.findByType('Map').props.onChange({latitude: 32.7266, longitude: 74.857});
    await settle();
  });
  await act(async () => { button('Confirm location & submit').props.onPress(); await settle(); });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate.mock.calls[0][0]).toMatchObject({...draft, location: {latitude: 32.7266, longitude: 74.857}});
  expect(mockCreate.mock.calls[0][0].clientRequestId).toMatch(/^[a-zA-Z0-9-]{16,80}$/);
  expect(mockVoice.speak).toHaveBeenLastCalledWith('Complaint submitted. Assigned to Drainage Worker', 'en-IN');
  expect(button('Track this complaint')).toBeDefined();
});

it('reuses the same submission and pin after a lost network response', async () => {
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft});
  mockCreate.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(saved);
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); await settle(); });
  await act(async () => { tree.root.findByType('Map').props.onChange({latitude: 32.7, longitude: 74.8}); await settle(); });
  await act(async () => { button('Confirm location & submit').props.onPress(); await settle(); });
  await act(async () => { button('Retry submission').props.onPress(); await settle(); });
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockCreate.mock.calls[1]).toEqual(mockCreate.mock.calls[0]);
});

it('stops the voice session without sending unfinished speech', async () => {
  let finish: (text: string) => void = () => {};
  mockVoice.listen.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { button('End voice conversation').props.onPress(); finish('Unfinished words'); await settle(); });
  expect(mockVoice.cancel).toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});

it('reads Hinglish with Hindi pronunciation while keeping the displayed reply in Roman script', async () => {
  await act(async () => {
    tree.unmount();
    tree = renderer.create(<ReportChat initialLanguage="hinglish" onBack={jest.fn()} onTrack={jest.fn()} />);
    await settle();
  });
  mockVoice.listen.mockResolvedValueOnce({text: 'नाली ओवरफ्लो हो रही है', confidence: 0.95});
  mockPost.mockResolvedValueOnce({reply: 'Theek hai, map par jagah chunein.', spokenReply: 'ठीक है, मैप पर जगह चुनें।', draft});
  await act(async () => { control('Voice conversation shuru karein').props.onPress(); await settle(); await settle(); });
  expect(mockVoice.listen).toHaveBeenCalledWith('hinglish');
  expect(mockVoice.speak).toHaveBeenCalledWith('ठीक है, मैप पर जगह चुनें।', 'hi-IN');
  expect(tree.root.findByType('Map')).toBeDefined();
});

it('shows live words and keeps uncertain recognition for review instead of sending it', async () => {
  let finish: (result: object) => void = () => {};
  mockVoice.listen.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => {
    DeviceEventEmitter.emit('ReportVoiceState', {type: 'ready'});
    DeviceEventEmitter.emit('ReportVoiceState', {type: 'partial', text: 'A broken street light'});
    DeviceEventEmitter.emit('ReportVoiceState', {type: 'level', level: 0.8});
    await settle();
  });
  expect(tree.root.findAll(node => node.type === 'Text' && node.props.children === 'A broken street light')).toHaveLength(1);
  await act(async () => { finish({text: 'A broken street light', confidence: 0.2}); await settle(); });
  expect(mockPost).not.toHaveBeenCalled();
  expect(control('Send').props.disabled).toBe(false);
  expect(tree.root.findByType(require('react-native').TextInput).props.value).toBe('A broken street light');
});

it('lets the citizen interrupt speech without an old completion stopping the new microphone', async () => {
  let finishSpeech: (spoken: boolean) => void = () => {};
  let finishWords: (text: string) => void = () => {};
  mockVoice.listen.mockResolvedValueOnce('There is a problem.').mockImplementationOnce(() => new Promise(resolve => { finishWords = resolve; }));
  mockVoice.speak.mockImplementationOnce(() => new Promise(resolve => { finishSpeech = resolve; }));
  mockPost.mockResolvedValueOnce({reply: 'What needs fixing?', draft: null}).mockResolvedValueOnce({reply: 'Choose the location.', draft});
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { button('Tap to interrupt').props.onPress(); await settle(); finishSpeech(false); await settle(); });
  expect(mockVoice.listen).toHaveBeenCalledTimes(2);
  expect(control('Finish speaking')).toBeDefined();
  await act(async () => { finishWords('The drain is overflowing.'); await settle(); });
  expect(mockPost.mock.calls[1][1].messages).toHaveLength(3);
  expect(tree.root.findByType('Map')).toBeDefined();
});

it('aborts an interrupted AI request and ignores its late response', async () => {
  let finishOldReply: (result: object) => void = () => {};
  mockVoice.listen.mockResolvedValueOnce('The streetlight is broken.').mockResolvedValueOnce('Correction, the drain is overflowing.');
  mockPost.mockImplementationOnce(() => new Promise(resolve => { finishOldReply = resolve; }))
    .mockResolvedValueOnce({reply: 'Choose the location.', draft});
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { button('Tap to interrupt').props.onPress(); await settle(); });
  expect(mockPost.mock.calls[0][2].signal.aborted).toBe(true);
  await act(async () => {
    finishOldReply({reply: 'Old reply', draft: {...draft, title: 'Wrong old issue'}});
    await settle();
  });
  expect(tree.root.findAll(node => node.props.children === 'Wrong old issue')).toHaveLength(0);
  expect(mockPost.mock.calls[1][1].messages.map((message: any) => message.content)).toEqual([
    'The streetlight is broken.', 'Correction, the drain is overflowing.',
  ]);
  expect(mockVoice.speak).toHaveBeenCalledTimes(1);
});

it('keeps a partial transcript for review when the recognition service returns no final result', async () => {
  let finish: (value: null) => void = () => {};
  mockVoice.listen.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => {
    DeviceEventEmitter.emit('ReportVoiceState', {type: 'partial', text: 'Garbage outside the school'});
    finish(null);
    await settle();
  });
  expect(mockPost).not.toHaveBeenCalled();
  expect(tree.root.findByType(require('react-native').TextInput).props.value).toBe('Garbage outside the school');
});

it('stops capture on backgrounding and ignores speech delivered afterwards', async () => {
  let finish: (text: string) => void = () => {};
  mockVoice.listen.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => {
    // The native bridge also emits this when Android pauses the host activity.
    DeviceEventEmitter.emit('ReportVoiceState', {type: 'cancelled'});
    finish('Speech from an ended session');
    await settle();
  });
  expect(mockVoice.cancel).toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
});

it('lets the citizen confirm the map while the draft reply is still speaking', async () => {
  let finishSpeech: (spoken: boolean) => void = () => {};
  let finishSubmission: (complaint: object) => void = () => {};
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockVoice.speak.mockImplementationOnce(() => new Promise(resolve => { finishSpeech = resolve; }));
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft});
  mockCreate.mockImplementationOnce(() => new Promise(resolve => { finishSubmission = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { tree.root.findByType('Map').props.onChange({latitude: 32.7, longitude: 74.8}); await settle(); });
  expect(button('Confirm location & submit').props.disabled).toBe(false);
  await act(async () => { button('Confirm location & submit').props.onPress(); finishSpeech(false); await settle(); });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(button('Submitting your complaint…').props.disabled).toBe(true);
  await act(async () => { finishSubmission(saved); await settle(); });
  expect(button('Track this complaint')).toBeDefined();
});

it('switches between voice and typing while preserving unsent text', async () => {
  expect(tree.root.findAllByType(require('react-native').TextInput)).toHaveLength(0);
  await act(async () => { control('Type instead').props.onPress(); await settle(); });
  await act(async () => { tree.root.findByType(require('react-native').TextInput).props.onChangeText('A broken streetlight.'); await settle(); });
  await act(async () => { control('Use voice').props.onPress(); await settle(); });
  expect(mockPost).not.toHaveBeenCalled();
  await act(async () => { control('Type instead').props.onPress(); await settle(); });
  expect(tree.root.findByType(require('react-native').TextInput).props.value).toBe('A broken streetlight.');
});

it('allows review edits, blocks an empty title, and submits the edited values', async () => {
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft});
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  await act(async () => { tree.root.findByType('Map').props.onChange({latitude: 32.7, longitude: 74.8}); await settle(); });
  await act(async () => { button('Edit details').props.onPress(); await settle(); });
  const input = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  await act(async () => { input('Complaint title').props.onChangeText(''); await settle(); });
  expect(button('Confirm location & submit').props.disabled).toBe(true);
  await act(async () => {
    input('Complaint title').props.onChangeText('  Drain outside the school  ');
    input('What needs fixing').props.onChangeText('  Dirty water is flowing outside the school gate.  ');
    await settle();
  });
  await act(async () => { button('Confirm location & submit').props.onPress(); await settle(); });
  expect(mockCreate.mock.calls[0][0]).toMatchObject({title: 'Drain outside the school', description: 'Dirty water is flowing outside the school gate.'});
});

it('ignores a photo chooser result after leaving the screen', async () => {
  let finish: (value: object) => void = () => {};
  mockChoosePhoto.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { control('Add photo').props.onPress(); await settle(); });
  await act(async () => { tree.unmount(); await settle(); finish(photo); await settle(); });
  expect(mockClassify).not.toHaveBeenCalled();
});

it('warms the selected voice before the first turn without starting recording or playback', async () => {
  expect(mockVoice.prepare).toHaveBeenCalledWith('en-IN');
  expect(mockVoice.listen).not.toHaveBeenCalled();
  expect(mockVoice.speak).not.toHaveBeenCalled();
  await act(async () => { tree.root.findByType('SegmentedControl').props.onChange('hinglish'); await settle(); });
  expect(mockVoice.prepare).toHaveBeenLastCalledWith('hi-IN');
  expect(mockVoice.listen).not.toHaveBeenCalled();
});

it('shows voice startup separately from audible playback', async () => {
  let finishSpeech: (spoken: boolean) => void = () => {};
  mockVoice.listen.mockResolvedValueOnce('The drain is overflowing.');
  mockPost.mockResolvedValueOnce({reply: 'Choose the location.', draft});
  mockVoice.speak.mockImplementationOnce(() => new Promise(resolve => { finishSpeech = resolve; }));
  await act(async () => { control('Start voice conversation').props.onPress(); await settle(); });
  const shows = (text: string) => tree.root.findAll(node => node.type === 'Text' && node.props.children === text).length > 0;
  expect(shows('Starting voice…')).toBe(true);
  expect(shows('AI is speaking…')).toBe(false);
  await act(async () => { DeviceEventEmitter.emit('ReportVoiceState', {type: 'speech_started'}); await settle(); });
  expect(shows('Starting voice…')).toBe(false);
  expect(shows('AI is speaking…')).toBe(true);
  await act(async () => { finishSpeech(true); await settle(); });
});
