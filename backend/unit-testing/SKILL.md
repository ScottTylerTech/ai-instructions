---
name: backend-unit-testing
description: 'Write backend unit/integration tests in C# using xUnit, Testcontainers, and EF Core against a real PostgreSQL database. Use when: writing manager tests, creating test classes with DatabaseFixture, adding tests that use TransactionalDbContext, writing tests with ChangeTracker.Clear(), hardcoding entity Ids, arranging minimal test data, or following team unit test standards and patterns.'
argument-hint: 'Describe the manager method or behavior to test'
---

# Backend Unit Testing

## When to Use
- Writing or generating new manager test classes or test methods
- Adding tests for methods that query a database (WHERE clause coverage)
- Following the team's patterns for test isolation, minimal data, and expected values
- Setting up test classes with `DatabaseFixture` and transactional rollback
- Writing tests for methods that internally use transactions (require separate container)

## Core Principles

### Test Isolation via Transactional Rollback
Every test that does **not** use an internal transaction must use a `TransactionalDbContext`. The transaction is never committed — EF Core rolls it back automatically when the `await using` block exits:

```csharp
await using DatabaseFixture.TransactionalDbContext transactionalContext = await _fixture.CreateTransactionalDbContextAsync();
```

### Methods That Contain Internal Transactions
If the method under test opens its own transaction, it cannot nest inside the shared rollback transaction. These test classes must:
- Spin up their own `DatabaseFixture` (not use the shared collection)
- Implement `IAsyncLifetime` to clean up tables after each test

## Test Class Setup

```csharp
[Collection("Database collection")]
public class MyManagerTests
{
    private readonly DatabaseFixture _fixture;

    public MyManagerTests(DatabaseFixture fixture)
    {
        _fixture = fixture;
    }
}
```

## Arrange, Act, Assert Pattern

Every test follows the **Arrange / Act / Assert** structure.

### Arrange
1. Create the `TransactionalDbContext`
2. Instantiate and save minimal entity data to the database
3. Call `transactionalContext.Context.ChangeTracker.Clear()` after saving
4. Set up the manager/class under test
5. Write out the expected value manually

### Act
One action per test. Call the method under test.

### Assert
Always use `Assert.Equivalent(..., strict: true)`. Strict mode ensures every field on the expected object is matched and no extra fields on the actual object are silently ignored. Use `Assert.EquivalentWithExclusions` (also with `strict: true`) when the returned object includes parent navigation properties that should not be compared.
When expecting a single item from a collection, assert count first, then equivalence:

```csharp
Assert.Single(actualItems);
Assert.Equivalent(expectedItem, actualItems.First(), strict: true);
```

## Clearing the ChangeTracker

**Always** clear the `ChangeTracker` in two places:

1. **After saving data during Arrange** — prevents EF Core from returning cached tracked entities instead of hitting the database
2. **Before querying the database to verify a side effect** — ensures a fresh read

```csharp
transactionalContext.Context.ChangeTracker.Clear();
```

Failure to clear causes tests to pass for the wrong reason (returning in-memory tracked data) or produce phantom failures.

## Minimal Data

- Only assign values to fields **required by the object** or **needed by the test**
- Do not populate unused navigation properties or child collections unless the test or the returned object requires them
- For GET-type methods that return children: include minimally-populated child objects to catch detachment bugs (Contract tests won't catch these)

## Hardcoding Ids

Use a unique, high-value Id series per entity type:

| Entity | Example Id Series |
|--------|-------------------|
| First entity type | 10001, 10002, … |
| Second entity type | 11001, 11002, … |
| Third entity type | 12001, 12002, … |

**Why:**
- Avoids confusion when multiple entities share an Id of `1`
- Prevents key violations when the database sequencer auto-assigns the same value

### POST-type tests: when you cannot hardcode the Id
If the business logic rejects a pre-set Id, reset the database sequence:

```csharp
await context.Database.ExecuteSqlRawAsync("ALTER SEQUENCE \"table_name_id_seq\" RESTART WITH 1");
```

Sequence name convention: snake_case table name + `_id_seq`. Verify in DBeaver if unsure.

## Expected Values

- Write the expected object **manually** — do not copy-reference the arranged input or saved entity
- Be explicit about every field, including foreign keys
- Use `Assert.Equivalent(..., strict: true)` to catch unexpected fields
- Use `Assert.EquivalentWithExclusions` when the returned object includes parent navigation properties

```csharp
MyEntity expected = new()
{
    Id = 11001,
    ParentId = 10001,
    Name = "Expected Name",
    TenantId = _fixture.Tenant.Id
};
```

## Effective Test Coverage

Examine the method under test:
- Identify every **parameter** that changes the query or outcome — test each in isolation
- Examine the **WHERE clause** — write a focused test for each filter condition
- Prefer one Action and one Assert per test
- Name tests: `MethodName_StateUnderTest_ExpectedBehavior`
  - Example: `GetAllParticipants_SameDocumentId_ReturnsOneUserAssignedDocument`

## What NOT to Do

- Do **not** share test data between tests (causes fragile, coupled tests)
- Do **not** use helper methods that obscure what data a test depends on
- Do **not** write logic (`if`, `for`, `switch`) inside test methods
- Do **not** use magic strings — assign constants
- Do **not** skip `ChangeTracker.Clear()` between context operations
- Do **not** test multiple concerns in a single test method

## Full Example

```csharp
[Fact]
public async Task GetAllParticipants_SameDocumentId_ReturnsOneUserAssignedDocument()
{
    // Arrange
    await using DatabaseFixture.TransactionalDbContext transactionalContext =
        await _fixture.CreateTransactionalDbContextAsync();

    int documentId = 35;
    DocumentType documentType = DocumentType.BudgetPlan;

    User user = new() { Id = 10001, SubjectIdentifier = "95da414c-0a55-4359-8610-8333a0a9779b", FirstName = "Bob", LastName = "Smith", Email = "bob.smith@email.com" };
    UserAssignedDocument userAssignedDocument    = new() { Id = 11001, DocumentId = documentId, DocumentType = documentType,                UserId = user.Id };
    UserAssignedDocument otherUserAssignedDocument = new() { Id = 11002, DocumentId = documentId, DocumentType = DocumentType.BudgetProposal, UserId = user.Id };

    transactionalContext.Context.Add(user);
    transactionalContext.Context.AddRange(userAssignedDocument, otherUserAssignedDocument);
    await transactionalContext.Context.SaveChangesAsync(TestContext.Current.CancellationToken);

    transactionalContext.Context.ChangeTracker.Clear();

    DocumentManager documentManager = SetupDocumentManager(transactionalContext.Context);

    UserAssignedDocument expected = new()
    {
        Id = 11001,
        DocumentId = 35,
        DocumentType = DocumentType.BudgetPlan,
        UserId = 10001,
        TenantId = _fixture.Tenant.Id
    };

    // Act
    List<UserAssignedDocument> actual = await documentManager.GetByAllParticipants(documentId, documentType);

    // Assert
    Assert.Single(actual);
    Assert.Equivalent(expected, actual.First(), strict: true);
}
```

## Checklist for Every Test

- [ ] Uses `await using TransactionalDbContext` (or owns its container for transaction methods)
- [ ] `ChangeTracker.Clear()` called after saving Arrange data
- [ ] `ChangeTracker.Clear()` called before any verification query
- [ ] Entity Ids are high-value, unique per entity type
- [ ] Only required or test-relevant fields are populated
- [ ] Expected object is written out explicitly (not referencing input objects)
- [ ] Test name follows `MethodName_StateUnderTest_ExpectedBehavior`
- [ ] One Act, minimal Asserts (count + equivalence for collections)
- [ ] No shared test data, no helper methods that hide test context
