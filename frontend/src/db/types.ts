// Types Supabase — générés manuellement pour Phase 1–4 (migrations 0001–0008)
// À régénérer via scripts/gen-db-types.sh après chaque migration

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          slug: string;
          name: string;
          plan: string;
          created_by: string;
          created_at: string;
          settings: Json;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          plan?: string;
          created_by: string;
          created_at?: string;
          settings?: Json;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          plan?: string;
          created_by?: string;
          created_at?: string;
          settings?: Json;
        };
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          token: string;
          role: 'admin' | 'member';
          status: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          token?: string;
          role?: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          token?: string;
          role?: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
      };
      lots: {
        Row: {
          id: string;
          workspace_id: string;
          address: string;
          city: string;
          postal_code: string;
          type: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2: number | null;
          rent_amount: number;
          charges_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          address: string;
          city: string;
          postal_code: string;
          type: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2?: number | null;
          rent_amount: number;
          charges_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          type?: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2?: number | null;
          rent_amount?: number;
          charges_amount?: number;
          created_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          workspace_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      leases: {
        Row: {
          id: string;
          workspace_id: string;
          lot_id: string;
          tenant_id: string;
          start_date: string;
          end_date: string | null;
          rent_amount: number;
          charges_amount: number;
          deposit_amount: number;
          status: 'active' | 'ended' | 'pending';
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lot_id: string;
          tenant_id: string;
          start_date: string;
          end_date?: string | null;
          rent_amount: number;
          charges_amount?: number;
          deposit_amount?: number;
          status?: 'active' | 'ended' | 'pending';
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lot_id?: string;
          tenant_id?: string;
          start_date?: string;
          end_date?: string | null;
          rent_amount?: number;
          charges_amount?: number;
          deposit_amount?: number;
          status?: 'active' | 'ended' | 'pending';
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          workspace_id: string;
          tenant_id: string | null;
          lease_id: string | null;
          subject: string;
          category: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status: 'open' | 'closed' | 'pending';
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          subject: string;
          category?: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status?: 'open' | 'closed' | 'pending';
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          subject?: string;
          category?: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status?: 'open' | 'closed' | 'pending';
          created_at?: string;
          last_message_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          file_name: string;
          file_path: string;
          doc_type: 'bail' | 'quittance' | 'etat_des_lieux' | 'facture' | 'autre';
          status: 'pending' | 'confirmed';
          extracted_data: Json | null;
          lot_id: string | null;
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          file_name: string;
          file_path: string;
          doc_type?: 'bail' | 'quittance' | 'etat_des_lieux' | 'facture' | 'autre';
          status?: 'pending' | 'confirmed';
          extracted_data?: Json | null;
          lot_id?: string | null;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          file_name?: string;
          file_path?: string;
          doc_type?: 'bail' | 'quittance' | 'etat_des_lieux' | 'facture' | 'autre';
          status?: 'pending' | 'confirmed';
          extracted_data?: Json | null;
          lot_id?: string | null;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_tenants: {
        Row: {
          document_id: string;
          tenant_id: string;
          workspace_id: string;
          created_at: string;
        };
        Insert: {
          document_id: string;
          tenant_id: string;
          workspace_id: string;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          tenant_id?: string;
          workspace_id?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          workspace_id: string;
          content: string;
          role: 'tenant' | 'manager' | 'ai';
          is_ai_draft: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          workspace_id: string;
          content: string;
          role: 'tenant' | 'manager' | 'ai';
          is_ai_draft?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          workspace_id?: string;
          content?: string;
          role?: 'tenant' | 'manager' | 'ai';
          is_ai_draft?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentTenant = Database['public']['Tables']['document_tenants']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type WorkspaceInvitation = Database['public']['Tables']['workspace_invitations']['Row'];
export type Lot = Database['public']['Tables']['lots']['Row'];
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Lease = Database['public']['Tables']['leases']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

export type WorkspaceRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type LotType = Lot['type'];
export type LeaseStatus = Lease['status'];
export type ConversationCategory = Conversation['category'];
export type ConversationStatus = Conversation['status'];
export type MessageRole = Message['role'];
