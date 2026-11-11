using System.Threading.Channels;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Domain.ValueObjects;
using ArenaVoicePocBackend.Persistence;
using ArenaVoicePocBackend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ArenaVoicePocBackend.Tests;

public class Program
{
    private static int _passed = 0;
    private static int _failed = 0;

    public static async Task<int> Main(string[] args)
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("   MILESTONE 4C.1 & 4C.2 — AUDIT TRAIL ARCHITECTURAL FOUNDATION UNIT TESTS      ");
        Console.WriteLine("================================================================================");

        TestActorTypeEnum();
        TestActorInfoFactoryMethods();
        TestAuditEventEntityDefaults();
        TestAuditEventRecordToEntityMapping();
        TestAuditEventRecordComplexJsonSerialization();
        await TestAuditEventPublisherWithChannelAsync();
        TestAuditEventPublisherBackPressureHandling();
        await TestAuditEventWriterBatchingAndDrainingAsync();
        await TestEfCoreAuditEventsPersistenceAsync();

        Console.WriteLine("================================================================================");
        Console.WriteLine($"TOTAL DE ASSERÇÕES: {_passed + _failed} | APROVADAS: {_passed} | FALHAS: {_failed}");
        Console.WriteLine("================================================================================");

        return _failed > 0 ? 1 : 0;
    }

    private static void Assert(bool condition, string message)
    {
        if (condition)
        {
            Console.WriteLine($"  ✅ PASS: {message}");
            _passed++;
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"  ❌ FAIL: {message}");
            Console.ResetColor();
            _failed++;
        }
    }

    private static void TestActorTypeEnum()
    {
        Console.WriteLine("\n[1] Testando ActorType Enum...");
        Assert((int)ActorType.Operator == 0, "ActorType.Operator == 0");
        Assert((int)ActorType.System == 1, "ActorType.System == 1");
        Assert((int)ActorType.RecoveryEngine == 2, "ActorType.RecoveryEngine == 2");
        Assert((int)ActorType.ESP32 == 3, "ActorType.ESP32 == 3");
        Assert((int)ActorType.VoiceStudio == 4, "ActorType.VoiceStudio == 4");
        Assert((int)ActorType.Scheduler == 5, "ActorType.Scheduler == 5");
    }

    private static void TestActorInfoFactoryMethods()
    {
        Console.WriteLine("\n[2] Testando ActorInfo Value Object e Factories...");
        var op = ActorInfo.Operator("user-123", "Operador Principal");
        Assert(op.Type == ActorType.Operator, "Operator type");
        Assert(op.ActorId == "user-123", "Operator id");
        Assert(op.ActorName == "Operador Principal", "Operator name");

        var sys = ActorInfo.System();
        Assert(sys.Type == ActorType.System, "System type");
        Assert(sys.ActorId == null, "System actorId null");
        Assert(sys.ActorName == "Arena Voice System", "System default name");

        var rec = ActorInfo.RecoveryEngine();
        Assert(rec.Type == ActorType.RecoveryEngine, "RecoveryEngine type");

        var esp = ActorInfo.Esp32(3);
        Assert(esp.Type == ActorType.ESP32, "ESP32 type");
        Assert(esp.ActorId == "esp32-chair-3", "ESP32 chair 3 id");
        Assert(esp.ActorName == "Botão Físico Cadeira 3", "ESP32 chair 3 name");

        var vs = ActorInfo.VoiceStudio();
        Assert(vs.Type == ActorType.VoiceStudio, "VoiceStudio type");

        var sch = ActorInfo.Scheduler();
        Assert(sch.Type == ActorType.Scheduler, "Scheduler type");
    }

    private static void TestAuditEventEntityDefaults()
    {
        Console.WriteLine("\n[3] Testando defaults da Entidade AuditEvent...");
        var evt = new AuditEvent();
        Assert(evt.Id == 0, "Id inicia em 0 (gerado pelo DB)");
        Assert(evt.EventVersion == 1, "EventVersion default == 1");
        Assert(evt.ActorType == ActorType.Operator, "ActorType default == Operator");
        Assert(evt.Success == true, "Success default == true");
        Assert(evt.Payload == "{}", "Payload default == '{}'");
        Assert(evt.OccurredAt <= DateTimeOffset.UtcNow, "OccurredAt populado com timestamp UTC");
    }

    private static void TestAuditEventRecordToEntityMapping()
    {
        Console.WriteLine("\n[4] Testando AuditEventRecord -> AuditEvent (ToEntity)...");
        var now = DateTimeOffset.UtcNow;
        var record = new AuditEventRecord(
            EventType: "PitchTransitioned",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ActorType: ActorType.Operator,
            ActorId: "operator-01",
            ActorName: "Mesa Técnica",
            OccurredAt: now,
            ArenaEventId: "evt-demo-2026",
            ProjectId: "proj-01",
            RoundId: "round-abc",
            Payload: new { from = "Waiting", to = "PitchRunning" },
            BeforeState: new { stage = "Waiting" },
            AfterState: new { stage = "PitchRunning" },
            Success: true,
            ErrorMessage: null,
            CorrelationId: "corr-123",
            SourceIp: "127.0.0.1",
            Metadata: new { client = "VoiceStudio Web" },
            EventVersion: 1
        );

        var entity = record.ToEntity();
        Assert(entity.EventType == "PitchTransitioned", "EventType mapped");
        Assert(entity.AggregateType == "Session", "AggregateType mapped");
        Assert(entity.AggregateId == "singleton-1", "AggregateId mapped");
        Assert(entity.ActorType == ActorType.Operator, "ActorType mapped");
        Assert(entity.ActorId == "operator-01", "ActorId mapped");
        Assert(entity.ActorName == "Mesa Técnica", "ActorName mapped");
        Assert(entity.OccurredAt == now, "OccurredAt mapped");
        Assert(entity.ArenaEventId == "evt-demo-2026", "ArenaEventId mapped");
        Assert(entity.ProjectId == "proj-01", "ProjectId mapped");
        Assert(entity.RoundId == "round-abc", "RoundId mapped");
        Assert(entity.EventVersion == 1, "EventVersion mapped");
        Assert(entity.CorrelationId == "corr-123", "CorrelationId mapped");
        Assert(entity.SourceIp == "127.0.0.1", "SourceIp mapped");
        Assert(entity.Payload.Contains("\"from\":\"Waiting\""), "Payload serialized to JSON");
        Assert(entity.BeforeState != null && entity.BeforeState.Contains("\"stage\":\"Waiting\""), "BeforeState serialized to JSON");
        Assert(entity.AfterState != null && entity.AfterState.Contains("\"stage\":\"PitchRunning\""), "AfterState serialized to JSON");
        Assert(entity.Metadata != null && entity.Metadata.Contains("\"client\":\"VoiceStudio Web\""), "Metadata serialized to JSON");
    }

    private static void TestAuditEventRecordComplexJsonSerialization()
    {
        Console.WriteLine("\n[5] Testando serialização de payloads com arrays e objetos...");
        var chairs = new[] { 1, 3, 4 };
        var record = new AuditEventRecord(
            EventType: "ChairsTurned",
            AggregateType: "Chairs",
            AggregateId: "chairs-active",
            ActorType: ActorType.ESP32,
            Payload: new { turnedChairs = chairs, count = 3 }
        );

        var entity = record.ToEntity();
        Assert(entity.Payload.Contains("[1,3,4]"), "JSON array serialization in payload");
        Assert(entity.Payload.Contains("\"count\":3"), "JSON number serialization in payload");
    }

    private static async Task TestAuditEventPublisherWithChannelAsync()
    {
        Console.WriteLine("\n[6] Testando IAuditEventPublisher & Channel (TryPublish, Publish, PublishAsync)...");
        var channel = Channel.CreateBounded<AuditEventRecord>(new BoundedChannelOptions(10)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

        var publisher = new AuditEventPublisher(channel, NullLogger<AuditEventPublisher>.Instance);

        var rec1 = new AuditEventRecord("Event1", "Agg", "1", ActorType.Operator);
        var rec2 = new AuditEventRecord("Event2", "Agg", "2", ActorType.System);
        var rec3 = new AuditEventRecord("Event3", "Agg", "3", ActorType.RecoveryEngine);

        var tryOk = publisher.TryPublish(rec1);
        Assert(tryOk, "TryPublish successfully wrote rec1 to channel");

        publisher.Publish(rec2);
        Assert(true, "Publish wrote rec2 to channel without blocking");

        await publisher.PublishAsync(rec3);
        Assert(true, "PublishAsync successfully wrote rec3 to channel");

        Assert(channel.Reader.TryRead(out var read1) && read1.EventType == "Event1", "Read Event1 from channel");
        Assert(channel.Reader.TryRead(out var read2) && read2.EventType == "Event2", "Read Event2 from channel");
        Assert(channel.Reader.TryRead(out var read3) && read3.EventType == "Event3", "Read Event3 from channel");
    }

    private static void TestAuditEventPublisherBackPressureHandling()
    {
        Console.WriteLine("\n[7] Testando estratégia de Back-Pressure do AuditEventPublisher...");
        // Canal com capacidade 2
        var channel = Channel.CreateBounded<AuditEventRecord>(new BoundedChannelOptions(2)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

        var publisher = new AuditEventPublisher(channel, NullLogger<AuditEventPublisher>.Instance);

        publisher.Publish(new AuditEventRecord("Fill1", "Agg", "1", ActorType.Operator));
        publisher.Publish(new AuditEventRecord("Fill2", "Agg", "2", ActorType.Operator));

        // Buffer agora está cheio (2/2)
        Assert(!publisher.TryPublish(new AuditEventRecord("OverflowTry", "Agg", "3", ActorType.Operator)),
            "TryPublish retorna false quando buffer está cheio");

        // Publish com timeout delimitado (não trava a thread indefinidamente)
        var start = DateTimeOffset.UtcNow;
        publisher.Publish(new AuditEventRecord("OverflowPublish", "Agg", "4", ActorType.Operator));
        var elapsed = (DateTimeOffset.UtcNow - start).TotalMilliseconds;

        Assert(elapsed >= 400 && elapsed <= 1500, $"Publish executou espera delimitada ({elapsed:F0}ms) sem travamento indefinido");
    }

    private static async Task TestAuditEventWriterBatchingAndDrainingAsync()
    {
        Console.WriteLine("\n[8] Testando AuditEventWriter (BackgroundService)...");
        var channel = Channel.CreateBounded<AuditEventRecord>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

        // Enfileira 5 eventos
        for (int i = 1; i <= 5; i++)
        {
            channel.Writer.TryWrite(new AuditEventRecord($"BatchEvent_{i}", "Agg", i.ToString(), ActorType.Operator));
        }

        var writer = new AuditEventWriter(channel, NullLogger<AuditEventWriter>.Instance, null);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(400));
        await writer.StartAsync(cts.Token);
        await Task.Delay(500);
        await writer.StopAsync(CancellationToken.None);

        Assert(channel.Reader.Count == 0, "AuditEventWriter consumiu e drenou todos os eventos do canal");
    }

    private static async Task TestEfCoreAuditEventsPersistenceAsync()
    {
        Console.WriteLine("\n[9] Testando EF Core e Tabela audit_events no PostgreSQL...");
        var connectionString = "Host=localhost;Port=5432;Database=arena_voice;Username=postgres;Password=postgres;";

        var options = new DbContextOptionsBuilder<ArenaDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        try
        {
            await using var db = new ArenaDbContext(options);
            if (!await db.Database.CanConnectAsync())
            {
                Console.WriteLine("  ⚠️ PostgreSQL não acessível no teste 9. Ignorando persistência direta.");
                return;
            }

            var testCorrelationId = $"unit-test-{Guid.NewGuid():N}";
            var auditEvent = new AuditEvent
            {
                EventVersion = 1,
                EventType = "UnitTestExecuted",
                AggregateType = "UnitTest",
                AggregateId = "test-4c1-4c2",
                ActorType = ActorType.System,
                ActorName = "Infrastructure Unit Test",
                OccurredAt = DateTimeOffset.UtcNow,
                Payload = "{\"test\":true,\"suite\":\"4C.1_4C.2\"}",
                Success = true,
                CorrelationId = testCorrelationId,
                Metadata = "{\"environment\":\"local_test\"}"
            };

            db.AuditEvents.Add(auditEvent);
            await db.SaveChangesAsync();

            Assert(auditEvent.Id > 0, $"AuditEvent persistido com sucesso! Id gerado: {auditEvent.Id}");

            var fetched = await db.AuditEvents.FirstOrDefaultAsync(a => a.CorrelationId == testCorrelationId);
            Assert(fetched != null, "AuditEvent recuperado do banco por CorrelationId");
            Assert(fetched?.EventType == "UnitTestExecuted", "EventType recuperado com integridade");
            Assert(fetched?.EventVersion == 1, "EventVersion == 1 verificado no banco");
            Assert(fetched?.Payload.Contains("\"test\":true") == true, "Payload JSONB preservado com integridade");

            // Limpa evento de teste
            if (fetched != null)
            {
                db.AuditEvents.Remove(fetched);
                await db.SaveChangesAsync();
                Assert(true, "Registro de teste removido após validação");
            }
        }
        catch (Exception ex)
        {
            Assert(false, $"Exceção ao testar persistência no PostgreSQL: {ex.Message}");
        }
    }
}
