using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Tindy.Application.Interfaces.Services;
using Tindy.Infrastructure.Persistence;
using Tindy.Tests.Integration;
using Xunit;

Directory.SetCurrentDirectory(args[0]);
Environment.SetEnvironmentVariable("ASPNETCORE_TEST_CONTENTROOT_TINDY_API", Path.Combine(args[0], "src", "Tindy.Api"));
var factory = new TindyApiFactory();
try
{
    await factory.InitializeAsync(); // owns a throwaway Testcontainers PostgreSQL; never app DB
    var seed = typeof(TindyApiFactory).Assembly.GetType("Tindy.Tests.Projects.TeammateTestData")!.GetMethod("Seed", BindingFlags.NonPublic | BindingFlags.Static)!;
    var task = (Task)seed.Invoke(null, [factory, 3, 8])!;
    await task;
    var data = task.GetType().GetProperty("Result")!.GetValue(task)!;
    Guid Id(string name) => (Guid)data.GetType().GetProperty(name)!.GetValue(data)!;
    var leader = Id("Leader"); var member = Id("Applicant"); var outsider = Id("Outsider"); var project = Id("Project"); var position = Id("Position");
    using var tokenScope = factory.Services.CreateScope();
    var jwt = tokenScope.ServiceProvider.GetRequiredService<IJwtTokenService>();
    var bootstrap = new { leader, member, outsider, project, position, otherPosition = Id("OtherPosition"), leaderToken = jwt.GenerateAccessToken(leader, ["Member"]).AccessToken, memberToken = jwt.GenerateAccessToken(member, ["Member"]).AccessToken, outsiderToken = jwt.GenerateAccessToken(outsider, ["Member"]).AccessToken };
    var releaseProjects = new HashSet<Guid> { project };
    object? releaseBootstrap = null;
    async Task<object> ReleaseCase(int required = 3, int capacity = 8)
    {
        var setup = (Task)seed.Invoke(null, [factory, required, capacity])!;
        await setup;
        var value = setup.GetType().GetProperty("Result")!.GetValue(setup)!;
        Guid Read(string name) => (Guid)value.GetType().GetProperty(name)!.GetValue(value)!;
        var p = Read("Project"); releaseProjects.Add(p);
        return new { leader = Read("Leader"), member = Read("Applicant"), outsider = Read("Outsider"), project = p,
            position = Read("Position"), otherPosition = Read("OtherPosition"),
            leaderToken = jwt.GenerateAccessToken(Read("Leader"), ["Member"]).AccessToken,
            memberToken = jwt.GenerateAccessToken(Read("Applicant"), ["Member"]).AccessToken,
            outsiderToken = jwt.GenerateAccessToken(Read("Outsider"), ["Member"]).AccessToken };
    }
    using var client = factory.CreateHttpsClient();
    var builder = WebApplication.CreateBuilder();
    builder.Logging.ClearProviders();
    builder.WebHost.UseUrls("http://127.0.0.1:0");
    var app = builder.Build();
    app.Run(async context =>
    {
        if (context.Request.Path == "/__test/bootstrap") { await context.Response.WriteAsJsonAsync(bootstrap); return; }
        // All audit controls are confined to this loopback-only, disposable test host.
        // They are never registered in the production API.
        if (context.Request.Path == "/__test/release-bootstrap")
        {
            if (releaseBootstrap == null)
            {
                using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TindyDbContext>();
                await db.UserProfiles.Where(p => p.UserId == member).ExecuteUpdateAsync(s => s.SetProperty(p => p.OpenToTeamInvitations, false));
                releaseBootstrap = new { primary = bootstrap, decline = await ReleaseCase(), cancel = await ReleaseCase(),
                    expiry = await ReleaseCase(), race = await ReleaseCase(), positionCapacity = await ReleaseCase(1, 8),
                    projectCapacity = await ReleaseCase(3, 2), pagination = await ReleaseCase() };
                // Keep the first browser discovery deterministic. Every subsequent
                // case explicitly opts in its fresh member through the real API.
                await db.UserProfiles.ExecuteUpdateAsync(s => s.SetProperty(p => p.OpenToTeamInvitations, false));
            }
            await context.Response.WriteAsJsonAsync(releaseBootstrap); return;
        }
        if (context.Request.Path == "/__test/release-state")
        {
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TindyDbContext>();
            var ids = releaseProjects.ToArray();
            await context.Response.WriteAsJsonAsync(new {
                migrations = await db.Database.GetAppliedMigrationsAsync(), pendingModelChanges = db.Database.HasPendingModelChanges(),
                members = await db.ProjectMembers.AsNoTracking().Where(m => ids.Contains(m.ProjectId)).Select(m => new { m.ProjectId, m.UserId, m.PositionId, m.Status, m.IsLeader }).ToArrayAsync(),
                positions = await db.ProjectPositions.AsNoTracking().Where(p => ids.Contains(p.ProjectId)).Select(p => new { p.ProjectId, p.PositionId, p.FilledCount, p.RequiredCount, p.Status }).ToArrayAsync(),
                invitations = await db.ProjectInvitations.AsNoTracking().Where(i => ids.Contains(i.ProjectId)).Select(i => new { i.InvitationId, i.ProjectId, i.InvitedUserId, i.Status }).ToArrayAsync(),
                notifications = await db.Notifications.AsNoTracking().Where(n => ids.Contains(n.Invitation.ProjectId)).Select(n => new { n.NotificationId, n.InvitationId, n.RecipientUserId, n.Type, n.ReadAt }).ToArrayAsync()
            }); return;
        }
        if (context.Request.Path == "/__test/expire-invitation" && context.Request.Method == "POST")
        {
            var input = await context.Request.ReadFromJsonAsync<Dictionary<string, Guid>>();
            var id = input!["invitation_id"];
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TindyDbContext>();
            var created = DateTime.UtcNow.AddHours(-169);
            var changed = await db.ProjectInvitations.Where(i => i.InvitationId == id && releaseProjects.Contains(i.ProjectId) && i.Status == "pending")
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.CreatedAt, created).SetProperty(i => i.UpdatedAt, created).SetProperty(i => i.ExpiresAt, created.AddHours(168)));
            await context.Response.WriteAsJsonAsync(new { changed }); return;
        }
        if (context.Request.Path == "/__test/deadline-past")
        {
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TindyDbContext>();
            await db.Projects.Where(p => p.ProjectId == project).ExecuteUpdateAsync(s => s.SetProperty(p => p.RecruitmentClosesAt, DateTime.UtcNow.AddMinutes(-1)));
            await context.Response.WriteAsJsonAsync(new { ok = true }); return;
        }
        if (context.Request.Path == "/__test/db-state")
        {
            using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TindyDbContext>();
            await context.Response.WriteAsJsonAsync(new { memberActive = await db.ProjectMembers.AnyAsync(m => m.ProjectId == project && m.UserId == member && m.Status == "active"), outsiderActive = await db.ProjectMembers.AnyAsync(m => m.ProjectId == project && m.UserId == outsider && m.Status == "active"), filled = await db.ProjectPositions.Where(p => p.PositionId == position).Select(p => p.FilledCount).SingleAsync(), interactions = await db.TeammateDiscoveryInteractions.CountAsync(i => i.ProjectId == project), invitations = await db.ProjectInvitations.Where(i => i.ProjectId == project).Select(i => new { i.Status, i.InvitedUserId }).ToArrayAsync() }); return;
        }
        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), context.Request.Path + context.Request.QueryString);
        if (context.Request.ContentLength > 0) { using var input = new MemoryStream(); await context.Request.Body.CopyToAsync(input); request.Content = new ByteArrayContent(input.ToArray()); }
        foreach (var header in context.Request.Headers)
        {
            if (new[] { "Host", "Content-Length", "Connection", "Transfer-Encoding" }.Contains(header.Key, StringComparer.OrdinalIgnoreCase)) continue;
            if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray())) request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
        using var result = await client.SendAsync(request);
        context.Response.StatusCode = (int)result.StatusCode;
        foreach (var h in result.Headers.Concat(result.Content.Headers)) if (!new[] { "Transfer-Encoding", "Content-Length" }.Contains(h.Key, StringComparer.OrdinalIgnoreCase)) context.Response.Headers[h.Key] = h.Value.ToArray();
        await result.Content.CopyToAsync(context.Response.Body);
    });
    await app.StartAsync();
    var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
    Console.WriteLine("TINDY_LIVE_READY " + address);
    await Task.Run(Console.ReadLine); // Node harness keeps stdin open, then requests clean disposal.
    await app.StopAsync();
}
finally { await ((IAsyncLifetime)factory).DisposeAsync(); }
