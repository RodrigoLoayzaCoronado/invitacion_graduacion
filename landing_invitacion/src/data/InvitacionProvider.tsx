import type { ReactNode } from 'react';
import { InvitacionCtx } from './contexto';
import type { DatosInvitacion } from './tipos';

const InvitacionProvider = ({ datos, children }: { datos: DatosInvitacion; children: ReactNode }) => (
  <InvitacionCtx.Provider value={datos}>{children}</InvitacionCtx.Provider>
);

export default InvitacionProvider;
