(function(exports, vendettaCommon, vendettaMetro, vendettaPlugin, vendettaUI) {
  "use strict";
  
  const { React, ReactNative, FluxDispatcher, clipboard } = vendettaCommon;
  const { View, Text, ScrollView, TouchableOpacity } = ReactNative;
  const { storage } = vendettaPlugin;
  const { Forms } = vendettaUI.components;
  const { showToast } = vendettaUI.toasts;
  const { semanticColors } = vendettaUI;
  const { getAssetIDByName } = vendettaUI.assets;
  const { findByStoreName } = vendettaMetro;
  
  const { FormSection, FormRow, FormInput, FormDivider, FormSwitchRow, FormText } = Forms;
  
  // Initialize storage
  storage.targetUserId ??= "";
  storage.fromUserId ??= "";
  storage.messageContent ??= "";
  storage.embedEnabled ??= false;
  storage.embedTitle ??= "";
  storage.embedDescription ??= "";
  storage.embedImageUrl ??= "";
  
  // Get Discord stores
  const MessageStore = findByStoreName("MessageStore");
  const ChannelStore = findByStoreName("ChannelStore");
  const UserStore = findByStoreName("UserStore");
  
  function createFakeMessage(channelId, authorId, content, embed) {
    const author = UserStore.getUser(authorId);
    const timestamp = new Date().toISOString();
    const messageId = "fake-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    
    return {
      id: messageId,
      channel_id: channelId,
      author: author || {
        id: authorId,
        username: "Unknown User",
        discriminator: "0000",
        avatar: null,
        bot: false
      },
      content: content,
      timestamp: timestamp,
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      attachments: [],
      embeds: embed ? [embed] : [],
      reactions: [],
      pinned: false,
      type: 0,
      flags: 0,
      _fake: true
    };
  }
  
  function injectFakeMessage(channelId, authorId, content, embed) {
    try {
      const fakeMessage = createFakeMessage(channelId, authorId, content, embed);
      
      if (FluxDispatcher) {
        FluxDispatcher.dispatch({
          type: "MESSAGE_CREATE",
          channelId: channelId,
          message: fakeMessage,
          optimistic: false
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error injecting fake message:", error);
      return false;
    }
  }
  
  function getDMChannel(userId) {
    try {
      const channels = ChannelStore.getSortedPrivateChannels();
      const existingDM = channels.find(function(channel) {
        return channel.type === 1 && channel.recipients && channel.recipients.includes(userId);
      });
      
      return existingDM ? existingDM.id : null;
    } catch (error) {
      console.error("Error getting DM channel:", error);
      return null;
    }
  }
  
  function Settings() {
    const [targetUserId, setTargetUserId] = React.useState(storage.targetUserId || "");
    const [fromUserId, setFromUserId] = React.useState(storage.fromUserId || "");
    const [messageContent, setMessageContent] = React.useState(storage.messageContent || "");
    const [embedEnabled, setEmbedEnabled] = React.useState(storage.embedEnabled || false);
    const [embedTitle, setEmbedTitle] = React.useState(storage.embedTitle || "");
    const [embedDescription, setEmbedDescription] = React.useState(storage.embedDescription || "");
    const [embedImageUrl, setEmbedImageUrl] = React.useState(storage.embedImageUrl || "");
    
    React.useEffect(function() { storage.targetUserId = targetUserId; }, [targetUserId]);
    React.useEffect(function() { storage.fromUserId = fromUserId; }, [fromUserId]);
    React.useEffect(function() { storage.messageContent = messageContent; }, [messageContent]);
    React.useEffect(function() { storage.embedEnabled = embedEnabled; }, [embedEnabled]);
    React.useEffect(function() { storage.embedTitle = embedTitle; }, [embedTitle]);
    React.useEffect(function() { storage.embedDescription = embedDescription; }, [embedDescription]);
    React.useEffect(function() { storage.embedImageUrl = embedImageUrl; }, [embedImageUrl]);
    
    const pasteTargetUserId = function() {
      clipboard.getString().then(function(text) {
        if (text) {
          setTargetUserId(text.trim());
          showToast("Pasted Target User ID", getAssetIDByName("toast_copy_link"));
        }
      }).catch(function() {
        showToast("Failed to paste", getAssetIDByName("Small"));
      });
    };
    
    const pasteSenderUserId = function() {
      clipboard.getString().then(function(text) {
        if (text) {
          setFromUserId(text.trim());
          showToast("Pasted Sender User ID", getAssetIDByName("toast_copy_link"));
        }
      }).catch(function() {
        showToast("Failed to paste", getAssetIDByName("Small"));
      });
    };
    
    const sendFakeMessage = function() {
      if (!targetUserId || !fromUserId || !messageContent) {
        showToast("Please fill in all required fields", getAssetIDByName("ic_close_16px"));
        return;
      }
      
      const channelId = getDMChannel(targetUserId);
      
      if (!channelId) {
        showToast("Could not find DM channel. Try opening a DM with this user first.", getAssetIDByName("ic_close_16px"));
        return;
      }
      
      let embed = null;
      if (embedEnabled && (embedTitle || embedDescription || embedImageUrl)) {
        embed = {
          type: "rich",
          title: embedTitle || undefined,
          description: embedDescription || undefined,
          image: embedImageUrl ? { url: embedImageUrl } : undefined,
          color: 5793266
        };
      }
      
      const success = injectFakeMessage(channelId, fromUserId, messageContent, embed);
      
      if (success) {
        showToast("✅ Fake message sent!", getAssetIDByName("toast_image_saved"));
      } else {
        showToast("Failed to send fake message", getAssetIDByName("ic_close_16px"));
      }
    };
    
    const quickTestMessage = function() {
      const currentUserId = UserStore.getCurrentUser()?.id;
      if (!currentUserId) {
        showToast("Could not get current user", getAssetIDByName("ic_close_16px"));
        return;
      }
      
      setTargetUserId(currentUserId);
      setFromUserId(currentUserId);
      setMessageContent("This is a test message!");
      showToast("Test values filled in", getAssetIDByName("toast_image_saved"));
    };
    
    return React.createElement(ScrollView, { style: { flex: 1, backgroundColor: semanticColors.BACKGROUND_MOBILE_PRIMARY } },
      React.createElement(FormSection, { title: "MESSAGE FAKER" },
        React.createElement(FormRow, {
          label: "Inject fake messages into DMs from anyone.",
          leading: React.createElement(FormRow.Icon, { source: getAssetIDByName("ic_message_edit") })
        })
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSection, { title: "CREATE FAKE MESSAGE" },
        React.createElement(FormRow, {
          label: "Create a fake message in someone's DM",
          leading: React.createElement(FormRow.Icon, { source: getAssetIDByName("ic_edit_24px") })
        })
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSection, { title: "TARGET USER ID (Whose DM)" },
        React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
          "User ID of person whose DM you want to inject into"
        ),
        React.createElement(FormInput, {
          value: targetUserId,
          onChange: setTargetUserId,
          placeholder: "Enter target user ID",
          title: "Target User ID"
        }),
        React.createElement(TouchableOpacity, {
          style: {
            backgroundColor: "#5865F2",
            padding: 15,
            borderRadius: 8,
            marginTop: 10,
            marginHorizontal: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          },
          onPress: pasteTargetUserId
        },
          React.createElement(Text, { style: { color: "white", fontSize: 16, fontWeight: "600" } },
            "📋 Paste Target User ID"
          )
        )
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSection, { title: "FROM USER ID (Who message is from)" },
        React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
          "User ID of who the message appears to be from"
        ),
        React.createElement(FormInput, {
          value: fromUserId,
          onChange: setFromUserId,
          placeholder: "Enter sender user ID",
          title: "From User ID"
        }),
        React.createElement(TouchableOpacity, {
          style: {
            backgroundColor: "#5865F2",
            padding: 15,
            borderRadius: 8,
            marginTop: 10,
            marginHorizontal: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          },
          onPress: pasteSenderUserId
        },
          React.createElement(Text, { style: { color: "white", fontSize: 16, fontWeight: "600" } },
            "📋 Paste Sender User ID"
          )
        )
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSection, { title: "MESSAGE CONTENT" },
        React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
          "The message text"
        ),
        React.createElement(FormInput, {
          value: messageContent,
          onChange: setMessageContent,
          placeholder: "Enter message content",
          title: "Message Content"
        })
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSwitchRow, {
        label: "Optional: Add an embed",
        leading: React.createElement(FormRow.Icon, { source: getAssetIDByName("ic_link") }),
        value: embedEnabled,
        onValueChange: setEmbedEnabled
      }),
      React.createElement(FormDivider, null),
      embedEnabled ? React.createElement(React.Fragment, null,
        React.createElement(FormSection, { title: "EMBED TITLE" },
          React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
            "Optional embed title"
          ),
          React.createElement(FormInput, {
            value: embedTitle,
            onChange: setEmbedTitle,
            placeholder: "Optional embed title",
            title: "Embed Title"
          })
        ),
        React.createElement(FormDivider, null),
        React.createElement(FormSection, { title: "EMBED DESCRIPTION" },
          React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
            "Optional embed description"
          ),
          React.createElement(FormInput, {
            value: embedDescription,
            onChange: setEmbedDescription,
            placeholder: "Optional embed description",
            title: "Embed Description"
          })
        ),
        React.createElement(FormDivider, null),
        React.createElement(FormSection, { title: "EMBED IMAGE URL" },
          React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
            "Optional image URL"
          ),
          React.createElement(FormInput, {
            value: embedImageUrl,
            onChange: setEmbedImageUrl,
            placeholder: "Optional image URL",
            title: "Embed Image URL"
          })
        ),
        React.createElement(FormDivider, null)
      ) : null,
      React.createElement(View, { style: { padding: 15 } },
        React.createElement(TouchableOpacity, {
          style: {
            backgroundColor: "#3BA55D",
            padding: 15,
            borderRadius: 8,
            marginBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          },
          onPress: sendFakeMessage
        },
          React.createElement(Text, { style: { color: "white", fontSize: 16, fontWeight: "600" } },
            "📧 Send Fake Message"
          )
        ),
        React.createElement(TouchableOpacity, {
          style: {
            backgroundColor: "#F26522",
            padding: 15,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          },
          onPress: quickTestMessage
        },
          React.createElement(Text, { style: { color: "white", fontSize: 16, fontWeight: "600" } },
            "✏️ Quick Test Message"
          )
        )
      ),
      React.createElement(FormDivider, null),
      React.createElement(FormSection, { title: "CONSOLE API" },
        React.createElement(FormText, { style: { color: semanticColors.TEXT_MUTED, marginBottom: 10 } },
          "You can also use the console for advanced usage"
        )
      ),
      React.createElement(View, { style: { height: 50 } })
    );
  }
  
  exports.default = {
    onLoad: function() {
      console.log("[MessageFaker] Plugin loaded!");
    },
    onUnload: function() {
      console.log("[MessageFaker] Plugin unloaded!");
    },
    settings: Settings
  };
  
  return exports;
})({}, vendetta.metro.common, vendetta.metro, vendetta.plugin, vendetta.ui);
