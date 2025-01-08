import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface Message {
	id: string;
	content: string;
	sender_id: string;
	created_at: string;
	edited_at: string | null;
	is_deleted: boolean;
}

interface Conversation {
	id: string;
	last_message: string | null;
	last_message_at: string | null;
	participants: {
		user_id: string;
		unread_count: number;
		last_read_at: string | null;
	}[];
}

interface MessagingContextType {
	conversations: Conversation[];
	activeConversation: string | null;
	messages: Message[];
	setActiveConversation: (id: string | null) => void;
	sendMessage: (content: string) => Promise<void>;
	markAsRead: () => Promise<void>;
	createConversation: (
		createdBy: string,
		participantIds: string[]
	) => Promise<string>;
	loading: boolean;
	error: string | null;
}

const MessagingContext = createContext<MessagingContextType | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversation, setActiveConversation] = useState<string | null>(
		null
	);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { userId } = useAuth();

	// Initial fetch of conversations
	useEffect(() => {
		if (!userId) return;
		fetchConversations();
	}, [userId]);

	// Subscribe to conversations
	useEffect(() => {
		if (!userId) return;

		const subscription = supabase
			.channel(`conversations:${userId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "conversation_participants",
					filter: `user_id=eq.${userId}`,
				},
				() => {
					fetchConversations();
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	}, [userId]);

	// Subscribe to messages for active conversation
	useEffect(() => {
		if (!activeConversation) return;

		const subscription = supabase
			.channel(`messages:${activeConversation}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${activeConversation}`,
				},
				() => {
					fetchMessages(activeConversation);
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	}, [activeConversation]);

	const fetchConversations = async () => {
		if (!userId) return;
		setLoading(true);
		try {
			const { data, error: fetchError } = await supabase
				.from("conversation_participants")
				.select(
					`
          conversation:conversations!inner(
              id,
              last_message,
              last_message_at
          ),
          user:auth.users!inner(
              id,
              email
          )
      `
				)
				.eq("user_id", userId)
				.order("last_message_at", {
					ascending: false,
					nullsFirst: false,
				});

			console.log(fetchError);

			if (fetchError) throw fetchError;

			// Transform the data to match our Conversation interface
			const transformedData =
				data?.map((item) => ({
					id: item.conversation.id,
					last_message: item.conversation.last_message,
					last_message_at: item.conversation.last_message_at,
					participants: [
						{
							user_id: item.user.id,
							email: item.user.email,
						},
					],
				})) || [];

			setConversations(transformedData);
		} catch (err) {
			console.error("Error fetching conversations:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch conversations"
			);
		} finally {
			setLoading(false);
		}
	};

	const fetchMessages = async (conversationId: string) => {
		try {
			const { data, error: fetchError } = await supabase
				.from("messages")
				.select("*")
				.eq("conversation_id", conversationId)
				.order("created_at", { ascending: true });

			if (fetchError) throw fetchError;
			setMessages(data || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch messages");
		}
	};

	const sendMessage = async (content: string) => {
		if (!activeConversation || !userId) return;

		try {
			const { error: sendError } = await supabase.from("messages").insert([
				{
					conversation_id: activeConversation,
					sender_id: userId,
					content,
				},
			]);

			if (sendError) throw sendError;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send message");
		}
	};

	const markAsRead = async () => {
		if (!activeConversation || !userId) return;

		try {
			await supabase.rpc("mark_messages_as_read", {
				p_conversation_id: activeConversation,
				p_user_id: userId,
			});
		} catch (err) {
			console.error("Error marking messages as read:", err);
		}
	};

	const createConversation = async (
		createdBy: string,
		participantIds: string[]
	): Promise<string> => {
		try {
			// Ensure we have valid participant IDs
			if (!participantIds.length || participantIds.length < 2) {
				throw new Error("At least two participants are required");
			}

			const { data, error } = await supabase.rpc("create_conversation", {
				created_by: createdBy,
				participant_ids: participantIds,
			});

			if (error) {
				console.error("Supabase error:", error);
				throw error;
			}

			if (!data) {
				throw new Error("No conversation ID returned");
			}

			// Refresh conversations list
			await fetchConversations();

			return data;
		} catch (err) {
			console.error("Error in createConversation:", err);
			setError(
				err instanceof Error ? err.message : "Failed to create conversation"
			);
			throw err;
		}
	};

	return (
		<MessagingContext.Provider
			value={{
				conversations,
				activeConversation,
				messages,
				setActiveConversation,
				sendMessage,
				markAsRead,
				createConversation,
				loading,
				error,
			}}
		>
			{children}
		</MessagingContext.Provider>
	);
}

export function useMessaging() {
	const context = useContext(MessagingContext);
	if (!context) {
		throw new Error("useMessaging must be used within a MessagingProvider");
	}
	return context;
}
