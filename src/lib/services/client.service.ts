import {
  findClientsByFirm,
  findClientById,
  insertClient,
  updateClientById,
  softDeleteClient,
  type ClientRow,
} from '@/lib/dal/client.dal';
import type { CreateClientInput, UpdateClientInput } from '@/lib/validations/client';

// Shape returned to API consumers — no internal DB fields
export interface ClientDTO {
  id: string;
  firmId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDTO(row: ClientRow): ClientDTO {
  return {
    id: row.id,
    firmId: row.firmId,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    // Expose addressLine1 as 'address' to match the simpler API contract
    address: row.addressLine1 ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listClients(
  firmId: string,
  search?: string
): Promise<ClientDTO[]> {
  const rows = await findClientsByFirm(firmId, search);
  return rows.map(toDTO);
}

export async function getClient(
  id: string,
  firmId: string
): Promise<ClientDTO | null> {
  const row = await findClientById(id, firmId);
  return row ? toDTO(row) : null;
}

export async function createClient(
  firmId: string,
  input: CreateClientInput
): Promise<ClientDTO> {
  const row = await insertClient(firmId, input);
  return toDTO(row);
}

export async function updateClient(
  id: string,
  firmId: string,
  input: UpdateClientInput
): Promise<ClientDTO | null> {
  const row = await updateClientById(id, firmId, input);
  return row ? toDTO(row) : null;
}

export async function deleteClient(
  id: string,
  firmId: string
): Promise<boolean> {
  const row = await softDeleteClient(id, firmId);
  return !!row;
}
