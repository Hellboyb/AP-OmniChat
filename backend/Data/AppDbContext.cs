using backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Conversation> Conversations => Set<Conversation>();

    public DbSet<AiConnection> AiConnections => Set<AiConnection>();

    public DbSet<Message> Messages => Set<Message>();

    public DbSet<MyChatMessage> MyChatMessages => Set<MyChatMessage>();

    public DbSet<Connection> Connections => Set<Connection>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>()
            .Property(x => x.DisplayName)
            .HasMaxLength(100);

        builder.Entity<Conversation>()
            .HasIndex(x => new
            {
                x.OwnerUserId,
                x.Channel
            });

        builder.Entity<Message>()
            .HasOne(x => x.Conversation)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<MyChatMessage>()
            .HasIndex(x => new
            {
                x.SenderUserId,
                x.RecipientUserId
            });
    }
}