import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSSO } from '../init-config';
import { fetchUser } from '../services/server-actions';

const FAST_ME = 'https://api.example.com/api/users/me-fast';
const FULL_ME = 'https://api.example.com/api/users/me';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const fastUser = {
  id: 'a1b2',
  firstName: 'Ana',
  lastName: 'Pérez',
  fullName: 'Ana Pérez',
  photoUrl: 'https://minio/photo.png',
  email: 'ana@example.com',
  emailIsVerified: true,
  phoneNumber: '+5355512345',
  phoneNumberLocal: '55512345',
  phoneCountryCode: 53,
  phoneIsVerified: false,
};

describe('fetchUser', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normaliza /users/me-fast a listas de un elemento', async () => {
    initSSO({ endpoints: { me: FAST_ME } });
    fetchMock.mockResolvedValueOnce(jsonResponse(fastUser));

    const res = await fetchUser('token');

    expect(res.error).toBe(false);
    expect(res.data?.name).toBe('Ana Pérez');
    expect(res.data?.photoUrl).toBe('https://minio/photo.png');
    expect(res.data?.emails).toEqual([
      { address: 'ana@example.com', isVerified: true, active: true },
    ]);
    expect(res.data?.phoneNumbers).toEqual([
      {
        number: '55512345',
        country: { phoneNumberCode: '53' },
        countryId: 0,
        isVerified: false,
        active: true,
      },
    ]);
  });

  it('sin código de país usa el número tal cual y sin contacto deja listas vacías', async () => {
    initSSO({ endpoints: { me: FAST_ME } });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...fastUser,
        email: null,
        emailIsVerified: null,
        phoneNumber: '55512345',
        phoneCountryCode: null,
      }),
    );

    const res = await fetchUser('token');

    expect(res.data?.emails).toEqual([]);
    expect(res.data?.phoneNumbers[0].number).toBe('55512345');
    expect(res.data?.phoneNumbers[0].country.phoneNumberCode).toBe('');
  });

  it('recurre a /users/me si me-fast no está desplegado', async () => {
    initSSO({ endpoints: { me: FAST_ME } });
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'a1b2',
          firstName: 'Ana',
          lastName: 'Pérez',
          profilePicturePath: 'https://minio/photo.png',
          emails: [{ address: 'ana@example.com', isVerified: true, active: true }],
          phoneNumbers: [],
        }),
      );

    const res = await fetchUser('token');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(FULL_ME);
    expect(res.data?.emails).toHaveLength(1);
  });

  it('no reintenta cuando el usuario está bloqueado (403)', async () => {
    initSSO({ endpoints: { me: FAST_ME } });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'El usuario está bloqueado' }, 403),
    );

    const res = await fetchUser('token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(true);
    expect(res.status).toBe(403);
  });

  it('no reintenta cuando el endpoint configurado es /users/me', async () => {
    initSSO({ endpoints: { me: FULL_ME } });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));

    const res = await fetchUser('token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(true);
  });
});
