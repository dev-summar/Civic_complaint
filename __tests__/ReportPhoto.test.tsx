import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Platform} from 'react-native';

Object.defineProperty(Platform, 'OS', {value: 'web'});
const mockClassify = jest.fn();
const mockPick = jest.fn();
const mockCreate = jest.fn();
jest.mock('@react-navigation/native', () => ({useNavigation: () => ({navigate: jest.fn(), setParams: jest.fn()}), useRoute: () => ({params: undefined})}));
jest.mock('react-native-gesture-handler', () => ({
  TouchableOpacity: require('react-native').TouchableOpacity,
  Pressable: require('react-native').Pressable,
}));
jest.mock('../src/services/engagement.service', () => ({classifyPhoto: (...args: unknown[]) => mockClassify(...args)}));
jest.mock('../src/utils/photo', () => ({capturePhoto: () => mockPick(), pickPhotoFromLibrary: () => mockPick()}));
jest.mock('../src/utils/haptics', () => ({hapticSuccess: jest.fn()}));
jest.mock('../src/utils/format', () => ({formatCoords: () => ''}));
jest.mock('../src/services/api', () => ({getErrorMessage: () => 'Unavailable'}));
jest.mock('../src/store/complaintStore', () => ({useComplaintStore: (select: any) => select({create: mockCreate, isLoading: false})}));
jest.mock('../src/store/appStore', () => ({useAppStore: (select: any) => select({language: 'en'})}));
jest.mock('../src/store/toastStore', () => ({showToast: jest.fn()}));
jest.mock('../src/hooks/useLocation', () => ({useLocation: () => ({location: null, refresh: jest.fn(), isLoading: false, error: null})}));
jest.mock('../src/components/maps', () => ({LocationPicker: (props: object) => require('react').createElement('Map', props)}));
jest.mock('../src/theme', () => ({useTheme: () => ({colors: {primary: '#123', primaryDark: '#123', surface: '#fff', text: '#111', border: '#ddd'}, spacing: {lg: 16, md: 12, sm: 8}, radius: {md: 12, xl: 20}, shadows: {sm: {}, card: {}}})}));
jest.mock('../src/components/ui', () => {
  const react = require('react');
  const element = (name: string) => ({children, ...props}: any) => react.createElement(name, props, children);
  return Object.fromEntries(['Screen', 'Button', 'Input', 'Checkbox', 'Text', 'AppIcon', 'Card', 'CategoryChip', 'PressableScale'].map(name => [name, element(name)]));
});
const ReportScreen = require('../src/screens/citizen/ReportScreen').default;
const photo = {uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg', base64: 'photo-bytes'};
const visible = {status: 'issue_visible', confidence: 'high', category: 'garbage', priority: 'low', title: 'Discarded bottle', summary: 'A discarded bottle is lying in grass.', spokenSummary: 'A discarded bottle is lying in grass.', evidence: 'Bottle in grass.'};
let tree: renderer.ReactTestRenderer;
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
function field(label: string) { return tree.root.findAll(node => node.type === 'Input' && node.props.label === label)[0]; }
function tile() { return tree.root.findAll(node => typeof node.type === 'function' && node.type.name === 'PhotoTile')[0]; }
async function pick(next = photo) {
  mockPick.mockResolvedValueOnce(next);
  tile().props.onAdd();
  await settle();
}
beforeEach(async () => {
  mockClassify.mockReset(); mockPick.mockReset(); mockCreate.mockReset();
  await act(async () => { tree = renderer.create(<ReportScreen />); await settle(); });
});
afterEach(async () => { await act(async () => { tree.unmount(); await settle(); }); });

it('fills empty title and description from a clear photo, preserving the ability to edit', async () => {
  mockClassify.mockResolvedValueOnce(visible);
  await act(async () => { await pick(); });
  expect(field('Title').props.value).toBe(visible.title);
  expect(field('Description').props.value).toBe(visible.summary);
  await act(async () => { field('Description').props.onChangeText('Bottle near the school gate.'); await settle(); });
  expect(field('Description').props.value).toBe('Bottle near the school gate.');
});

it('does not create a description for an unrelated photo', async () => {
  mockClassify.mockResolvedValueOnce({...visible, status: 'no_clear_issue', category: 'others', title: '', summary: '', message: 'No clear issue visible.'});
  await act(async () => { await pick(); });
  expect(field('Title').props.value).toBe('');
  expect(field('Description').props.value).toBe('');
  expect(tree.root.findAll(node => node.type === 'CategoryChip' && node.props.selected)).toHaveLength(0);
});

it('preserves citizen-written details and manual category when a photo is analyzed or replaced', async () => {
  const manual = 'A drain is overflowing near my gate.';
  await act(async () => {
    field('Title').props.onChangeText('Blocked drain');
    field('Description').props.onChangeText(manual);
    tree.root.findAll(node => node.type === 'CategoryChip')[0].props.onPress();
    await settle();
  });
  mockClassify.mockResolvedValueOnce(visible).mockResolvedValueOnce({...visible, title: 'Wrapper on ground', summary: 'A wrapper is on the ground.'});
  await act(async () => { await pick(); });
  await act(async () => { await pick({...photo, uri: 'file:///other.jpg'}); });
  expect(field('Title').props.value).toBe('Blocked drain');
  expect(field('Description').props.value).toBe(manual);
  expect(tree.root.findAll(node => node.type === 'CategoryChip' && node.props.selected)).toHaveLength(1);
});

it('clears obsolete auto-filled details when a replacement photo shows no issue', async () => {
  mockClassify.mockResolvedValueOnce(visible).mockResolvedValueOnce({...visible, status: 'no_clear_issue', title: '', summary: '', message: 'No clear issue visible.'});
  await act(async () => { await pick(); });
  await act(async () => { await pick({...photo, uri: 'file:///other.jpg'}); });
  expect(field('Title').props.value).toBe('');
  expect(field('Description').props.value).toBe('');
});

it('cancels a superseded request and ignores its late result', async () => {
  let finishOld: (value: object) => void = () => {};
  mockClassify.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({...visible, title: 'Latest photo'});
  await act(async () => { await pick(); });
  await act(async () => { await pick({...photo, uri: 'file:///other.jpg'}); });
  expect(mockClassify.mock.calls[0][2].aborted).toBe(true);
  await act(async () => { finishOld({...visible, title: 'Outdated photo'}); await settle(); });
  expect(field('Title').props.value).toBe('Latest photo');
});
