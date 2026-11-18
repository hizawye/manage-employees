import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLogs } from '../../src/hooks/useLogs';
import { LogService } from '../../src/services/LogService';
import { Log, LogCategory } from '../../src/models';

let mockOwner = 3;
jest.mock('../../src/auth/useAuth', () => ({ useAuth: () => ({ user: { id: mockOwner } }) }));
jest.mock('../../src/services/LogService', () => ({ LogService: { getPage: jest.fn() } }));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key }));

const entry = (id: number): Log => ({ id: String(id), action: 'x', userId: 3, description: 'test', createdAt: '2026-01-01' });
it('keeps the loaded second page and ignores a previous account’s late completion', async () => {
  const getPage = jest.mocked(LogService.getPage);
  const first = Array.from({length: 51}, (_, i) => entry(i));
  getPage.mockResolvedValueOnce(first).mockResolvedValueOnce([entry(50)]);
  const { result, rerender } = renderHook((category: LogCategory) => useLogs(category), { initialProps: 'payroll' as LogCategory });
  await waitFor(() => expect(result.current.logs).toHaveLength(50));
  await act(async () => { await result.current.loadMore(); });
  expect(result.current.logs).toHaveLength(51);
  expect(getPage).toHaveBeenCalledTimes(2);
  expect(getPage.mock.calls[1][3]).toEqual(first[49]);
  let complete!: (items: Log[]) => void;
  getPage.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  act(() => { void result.current.refresh(); });
  mockOwner = 9;
  getPage.mockResolvedValueOnce([]);
  rerender('attendance');
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { complete([entry(987)]); });
  expect(result.current.logs).toEqual([]);
});
