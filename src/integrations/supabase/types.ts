export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      workspace_provider_credentials: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          api_token_ciphertext: string;
          hmac_secret_ciphertext: string | null;
          linked_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: string;
          api_token_ciphertext: string;
          hmac_secret_ciphertext?: string | null;
          linked_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          api_token_ciphertext?: string;
          hmac_secret_ciphertext?: string | null;
          linked_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shopify_stores: {
        Row: {
          access_token: string;
          id: string;
          installed_at: string;
          last_sync_at: string | null;
          scope: string | null;
          shop_domain: string;
          uninstalled_at: string | null;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          access_token: string;
          id?: string;
          installed_at?: string;
          last_sync_at?: string | null;
          scope?: string | null;
          shop_domain: string;
          uninstalled_at?: string | null;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          access_token?: string;
          id?: string;
          installed_at?: string;
          last_sync_at?: string | null;
          scope?: string | null;
          shop_domain?: string;
          uninstalled_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string | null;
          whatsapp_auto_confirm: boolean;
          whatsapp_confirm_keywords: string[];
          whatsapp_reject_keywords: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          owner_user_id?: string | null;
          whatsapp_auto_confirm?: boolean;
          whatsapp_confirm_keywords?: string[];
          whatsapp_reject_keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string | null;
          whatsapp_auto_confirm?: boolean;
          whatsapp_confirm_keywords?: string[];
          whatsapp_reject_keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      phase0_migration_report: {
        Row: {
          id: string;
          created_at: string;
          kind: string;
          workspace_id: string | null;
          details: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          kind: string;
          workspace_id?: string | null;
          details?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          kind?: string;
          workspace_id?: string | null;
          details?: Json;
        };
        Relationships: [];
      };
      workspace_webhook_endpoints: {
        Row: {
          created_at: string;
          id: string;
          supply: string;
          token: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          supply: string;
          token: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          supply?: string;
          token?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          supply: string;
          kind: string;
          name: string;
          description: string;
          content: string;
          workspace_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supply: string;
          kind: string;
          name: string;
          description?: string;
          content: string;
          workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supply?: string;
          kind?: string;
          name?: string;
          description?: string;
          content?: string;
          workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_events: {
        Row: {
          created_at: string;
          details: string | null;
          event_date: string;
          id: string;
          order_id: number;
          raw: Json | null;
          shipping_company: string | null;
          shopify_order_id: number | null;
          source: string;
          status_id: number | null;
          status_name: string | null;
          total: number | null;
          tracking_code: string | null;
          tracking_url: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          event_date: string;
          id?: string;
          order_id: number;
          raw?: Json | null;
          shipping_company?: string | null;
          shopify_order_id?: number | null;
          source?: string;
          status_id?: number | null;
          status_name?: string | null;
          total?: number | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          event_date?: string;
          id?: string;
          order_id?: number;
          raw?: Json | null;
          shipping_company?: string | null;
          shopify_order_id?: number | null;
          source?: string;
          status_id?: number | null;
          status_name?: string | null;
          total?: number | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      order_confirmation_events: {
        Row: {
          id: string;
          workspace_id: string;
          order_uuid: string | null;
          order_id: number | null;
          event_type: "confirmation_classified" | "order_confirmed" | "cod_operation_handled";
          source: "whatsapp_auto" | "operator" | "system";
          intent: "confirm" | "reject" | "needs_operator" | null;
          reason: string | null;
          conversation_id: string | null;
          message_id: string | null;
          actor_user_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          order_uuid?: string | null;
          order_id?: number | null;
          event_type: "confirmation_classified" | "order_confirmed" | "cod_operation_handled";
          source: "whatsapp_auto" | "operator" | "system";
          intent?: "confirm" | "reject" | "needs_operator" | null;
          reason?: string | null;
          conversation_id?: string | null;
          message_id?: string | null;
          actor_user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          order_uuid?: string | null;
          order_id?: number | null;
          event_type?: "confirmation_classified" | "order_confirmed";
          source?: "whatsapp_auto" | "operator" | "system";
          intent?: "confirm" | "reject" | "needs_operator" | null;
          reason?: string | null;
          conversation_id?: string | null;
          message_id?: string | null;
          actor_user_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          address: string | null;
          city: string | null;
          confirmation_conversation_id: string | null;
          confirmation_message_id: string | null;
          confirmation_source: string | null;
          cod_handled_at: string | null;
          cod_handled_by_user_id: string | null;
          cod_reply_at: string | null;
          cod_reply_intent: "confirm" | "reject" | "needs_operator" | null;
          cod_reply_text: string | null;
          cod_request_sent_at: string | null;
          confirmed_at: string | null;
          confirmed_by_user_id: string | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          customer_name: string | null;
          details: string | null;
          email: string | null;
          external_confirmation_status: string;
          id: string;
          last_event_at: string | null;
          order_id: number;
          phone: string | null;
          postal_code: string | null;
          product_summary: string | null;
          shipping_company: string | null;
          shopify_order_id: number | null;
          snapshot: Json | null;
          source: string;
          status_id: number | null;
          status_name: string | null;
          total: number | null;
          tracking_code: string | null;
          tracking_url: string | null;
          updated_at: string;
          workspace_id: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          confirmation_conversation_id?: string | null;
          confirmation_message_id?: string | null;
          confirmation_source?: string | null;
          cod_handled_at?: string | null;
          cod_handled_by_user_id?: string | null;
          cod_reply_at?: string | null;
          cod_reply_intent?: "confirm" | "reject" | "needs_operator" | null;
          cod_reply_text?: string | null;
          cod_request_sent_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by_user_id?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          customer_name?: string | null;
          details?: string | null;
          email?: string | null;
          external_confirmation_status?: string;
          id?: string;
          last_event_at?: string | null;
          order_id: number;
          phone?: string | null;
          postal_code?: string | null;
          product_summary?: string | null;
          shipping_company?: string | null;
          shopify_order_id?: number | null;
          snapshot?: Json | null;
          source?: string;
          status_id?: number | null;
          status_name?: string | null;
          total?: number | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          confirmation_conversation_id?: string | null;
          confirmation_message_id?: string | null;
          confirmation_source?: string | null;
          cod_handled_at?: string | null;
          cod_handled_by_user_id?: string | null;
          cod_reply_at?: string | null;
          cod_reply_intent?: "confirm" | "reject" | "needs_operator" | null;
          cod_reply_text?: string | null;
          cod_request_sent_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by_user_id?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          customer_name?: string | null;
          details?: string | null;
          email?: string | null;
          external_confirmation_status?: string;
          id?: string;
          last_event_at?: string | null;
          order_id?: number;
          phone?: string | null;
          postal_code?: string | null;
          product_summary?: string | null;
          shipping_company?: string | null;
          shopify_order_id?: number | null;
          snapshot?: Json | null;
          source?: string;
          status_id?: number | null;
          status_name?: string | null;
          total?: number | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      whatsapp_connection_secrets: {
        Row: {
          connection_id: string;
          token_ciphertext: string | null;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          connection_id: string;
          token_ciphertext?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          connection_id?: string;
          token_ciphertext?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_connection_secrets_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: true;
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_connections: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          meta_business_id: string | null;
          waba_id: string | null;
          phone_number_id: string | null;
          display_phone_number: string | null;
          verified_name: string | null;
          status: string;
          connected_at: string | null;
          disconnected_at: string | null;
          last_seen_at: string | null;
          last_error_code: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider?: string;
          meta_business_id?: string | null;
          waba_id?: string | null;
          phone_number_id?: string | null;
          display_phone_number?: string | null;
          verified_name?: string | null;
          status?: string;
          connected_at?: string | null;
          disconnected_at?: string | null;
          last_seen_at?: string | null;
          last_error_code?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: string;
          meta_business_id?: string | null;
          waba_id?: string | null;
          phone_number_id?: string | null;
          display_phone_number?: string | null;
          verified_name?: string | null;
          status?: string;
          connected_at?: string | null;
          disconnected_at?: string | null;
          last_seen_at?: string | null;
          last_error_code?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_conversations: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string;
          order_id: string | null;
          customer_phone_e164: string;
          status: string;
          last_message_at: string | null;
          unread_count: number;
          last_message_preview: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id: string;
          order_id?: string | null;
          customer_phone_e164: string;
          status?: string;
          last_message_at?: string | null;
          unread_count?: number;
          last_message_preview?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          connection_id?: string;
          order_id?: string | null;
          customer_phone_e164?: string;
          status?: string;
          last_message_at?: string | null;
          unread_count?: number;
          last_message_preview?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_connection_workspace_fkey";
            columns: ["connection_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_order_workspace_fkey";
            columns: ["order_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_conversations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_session_keys: {
        Row: {
          id: string;
          session_id: string;
          key_type: string;
          key_id: string;
          encrypted_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          key_type: string;
          key_id: string;
          encrypted_value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          key_type?: string;
          key_id?: string;
          encrypted_value?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_session_keys_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_sessions: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string;
          provider: string;
          encrypted_creds: string;
          session_version: number;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id: string;
          provider?: string;
          encrypted_creds: string;
          session_version?: number;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          connection_id?: string;
          provider?: string;
          encrypted_creds?: string;
          session_version?: number;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_sessions_connection_workspace_fkey";
            columns: ["connection_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_sessions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          workspace_id: string;
          connection_id: string;
          conversation_id: string | null;
          order_id: string | null;
          whatsapp_message_id: string | null;
          direction: string;
          message_type: string;
          template_name: string | null;
          recipient_phone_e164: string | null;
          sender_phone_e164: string | null;
          message_body: string | null;
          status: string;
          meta_error_code: string | null;
          meta_error_message: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          failed_at: string | null;
          client_message_id: string | null;
          send_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          connection_id: string;
          conversation_id?: string | null;
          order_id?: string | null;
          whatsapp_message_id?: string | null;
          direction: string;
          message_type?: string;
          template_name?: string | null;
          recipient_phone_e164?: string | null;
          sender_phone_e164?: string | null;
          message_body?: string | null;
          status?: string;
          meta_error_code?: string | null;
          meta_error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          client_message_id?: string | null;
          send_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          connection_id?: string;
          conversation_id?: string | null;
          order_id?: string | null;
          whatsapp_message_id?: string | null;
          direction?: string;
          message_type?: string;
          template_name?: string | null;
          recipient_phone_e164?: string | null;
          sender_phone_e164?: string | null;
          message_body?: string | null;
          status?: string;
          meta_error_code?: string | null;
          meta_error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          client_message_id?: string | null;
          send_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_connection_workspace_fkey";
            columns: ["connection_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_workspace_fkey";
            columns: ["conversation_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_conversations";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_messages_order_workspace_fkey";
            columns: ["order_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "whatsapp_messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      enqueue_whatsapp_outbound_message: {
        Args: {
          p_workspace_id: string;
          p_connection_id: string;
          p_order_id: string | null;
          p_client_message_id: string;
          p_recipient_phone_e164: string;
          p_message_body: string;
        };
        Returns: {
          message_id: string;
          should_send: boolean;
          status: string;
          whatsapp_message_id: string | null;
        }[];
      };
      upsert_whatsapp_inbound_message: {
        Args: {
          p_workspace_id: string;
          p_connection_id: string;
          p_external_message_id: string;
          p_sender_phone_e164: string;
          p_message_body: string;
          p_message_at?: string;
        };
        Returns: {
          inserted: boolean;
          message_id: string;
          conversation_id: string;
          duplicate: boolean;
        }[];
      };
      mark_whatsapp_conversation_read: {
        Args: {
          p_workspace_id: string;
          p_conversation_id: string;
        };
        Returns: undefined;
      };
      ensure_whatsapp_conversation: {
        Args: {
          p_workspace_id: string;
          p_connection_id: string;
          p_customer_phone_e164: string;
          p_order_id?: string | null;
        };
        Returns: string;
      };
      mark_cod_operation_handled: {
        Args: {
          p_workspace_id: string;
          p_order_uuid: string;
          p_actor_user_id: string;
        };
        Returns: {
          applied: boolean;
          already_handled: boolean;
          event_id: string | null;
        }[];
      };
      confirm_order_cod: {
        Args: {
          p_workspace_id: string;
          p_order_uuid: string;
          p_source: string;
          p_conversation_id?: string | null;
          p_message_id?: string | null;
          p_actor_user_id?: string | null;
          p_intent_reason?: string | null;
        };
        Returns: {
          applied: boolean;
          already_confirmed: boolean;
          order_uuid: string;
          confirmation_event_id: string | null;
        }[];
      };
      record_confirmation_classification: {
        Args: {
          p_workspace_id: string;
          p_message_id: string;
          p_conversation_id: string;
          p_intent: string;
          p_reason?: string | null;
          p_order_uuid?: string | null;
          p_source?: string;
        };
        Returns: {
          inserted: boolean;
          event_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
