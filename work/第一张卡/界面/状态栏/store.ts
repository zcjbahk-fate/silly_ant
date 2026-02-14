import { defineMvuDataStore } from '@/util/mvu';
import { Schema, type Schema as SchemaType } from '../../schema';

const _useDataStore = defineMvuDataStore(Schema, { type: 'message', message_id: getCurrentMessageId() });

export const useDataStore = () => _useDataStore() as unknown as { data: SchemaType };
