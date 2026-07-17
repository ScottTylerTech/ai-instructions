---
name: feature-flags
description: 'Backend and BFF feature flag integration with Harness .NET SDK. Use when adding server-side flag evaluation, configuring target details, updating backend behavior behind flags, or writing BFF/controller tests for flag-on and flag-off paths.'
argument-hint: 'Describe the backend or BFF feature flag scenario to implement or review'
---

# Backend Feature Flags (BFF + API)

This skill is backend-focused. For Angular and TypeScript usage patterns, use `frontend/feature-flags/SKILL.md`.

## Harness context
- Environments: CI, QA, and Prod
  - Each environment has an API key, which is stored in AWS Secrets Manager and is injected into each budget service via GitOps
- Feature flags
  - Flags can be temporary or permanent 
  - Flags can be of four different types
    - boolean
    - string
    - double
    - json
- Targets and target groups
  - Enable controlling flag setting based on targets, such as individual workspaces and/or users within an environment. 

## Consuming the backend feature flags framework

## Add feature flags library in .csproj
```c#
using TipeCore.FeatureFlags.Harness.Extensions;
using budget_common_feature_flags.Enums;
using budget_common_feature_flags.Controllers;
using TipeCore.FeatureFlags.Harness.Interfaces;


services.AddHarnessFeatureFlags<BudgetFeatureFlagsHarness>(featureFlagConfiguration =>
{
  featureFlagConfiguration.SdkApiKey = Configuration["FeatureFlags:SdkApiKey"];
  featureFlagConfiguration.UseLocal = Configuration.GetValue<bool>("FeatureFlags:UseLocal");
  featureFlagConfiguration.FeatureConfigs = Configuration.GetSection("FeatureFlags:FeatureConfigs").Get<List<FeatureConfig>>();
});

services.AddScoped((provider) => new BudgetFeatureFlagsController(
  provider.GetRequiredService<ILoggerFactory>(), 
  provider.GetRequiredService<IFeatureFlags<BudgetFeatureFlagsHarness>>(), 
  provider.GetRequiredService<ITargetDetailsProvider>())
);
```

## Define feature flag in budget-common library
Once the feature flag is created in Harness, the flag needs to be added to the BudgetFeatureFlagsHarness Enum in the budget common library. It has two attributes: 1) feature flag ID that has to match that in Harness, and 2) feature flag type. Example:

```c#
public enum BudgetFeatureFlagsHarness
{
    [FeatureFlagInfo("Config_AWSS3TestPage", FeatureFlagType.Bool)]
    Config_AWSS3TestPage,
}
```

## Define a feature flag in the local dev environment
Feature flag configs for local dev live in budget-dev-env-compose -> docker-compose -> config -> appsettings -> budget-feature-flags-json. This file will be updated whenever a new flag is created - be sure to get the latest when working with feature flags. It will only contain the basic properties needed during dev testing. By default, these will all have state: "on". During local dev testing, this property can be changed to state: "off"; any changes made to this file during local dev testing should not be checked in.

When changes are made to this file, a few things need to be done to make these changes reflect in the app.

1. The base containers (bootstrap-config and bootstrap-oidc) need to be re-upped. In the budget-dev-env-compose -> docker-compose folder, run docker compose down, and then docker compose up -d.
2. If the service with feature flags is running from VS Code, restart the service. If the service is running in the container, restart the container. 
3. Alternatively to these first two steps, the startup.sh script can be rerun, it just takes longer since it's repulling all budget containers.
4. After a few seconds, refresh the relevant page in the browser; if it errors, refresh again.

When the feature flag framework is added to a repo for the first time, make sure the budget-feature-flags.json is registered in Program.cs -> CreateHostBuilder(string[] args) method:

```c#
.AddConsulServer(appsettingsConfig, "budget-feature-flags/appsettings.json")
```

The "dev" and "feature-flags" folder should be added to .gitignore if it isn't already:

```gitignore
# Ignore local dev files
*dev
# Ignore local feature flags
*feature-flags
```

## Inline removal comments on feature flag conditionals

Every `if`/`else` block (and any surrounding setup code) that is gated by a feature flag **must** include an inline `// TODO:` comment on the same line or the line immediately above the conditional, referencing the Jira task that will remove the flag and its associated logic. This makes the cleanup work easy to discover via `TODO` search.

**Rules:**
- Put the comment on the `if` line for the flag-on branch and on the `else` line (or `// TODO: Remove with <ticket>` directly above `} else {`) for the flag-off branch.
- Use the exact format: `// TODO: <ticket> remove <description of what to remove>`
- Apply the same rule to BFF/backend `if` blocks that evaluate a flag.

**Example (BFF/backend):**
```csharp
// TODO: TPB-12345 remove flag conditional and keep flag-on path only
if (feature1Enabled)
{
    // new behaviour
}
else // TODO: TPB-12345 remove this else branch
{
    // old behaviour
}
```

## Evaluate the feature flag in the BFF
Feature flag evaluations at the BFF level use Tipe Core feature flags framework directly. Example:

```c#
using TipeCore.AspNetCore.Http.Exceptions;
using TipeCore.FeatureFlags.Harness;
using TipeCore.FeatureFlags.Harness.Interfaces;
protected IFeatureFlags<BudgetFeatureFlagsHarness> _featureFlags;
private readonly ITargetDetailsProvider _featureFlagTargetDetailsProvider;
public Controller(IFeatureFlags<BudgetFeatureFlagsHarness> featureFlags, ITargetDetailsProvider featureFlagTargetDetailsProvider)
{
 	_featureFlags = featureFlags;
    _featureFlagTargetDetailsProvider = featureFlagTargetDetailsProvider;
}
// Use feature flag framework classes where flag evaluation is needed:
// With target details (Send target details by default with any flag unless specifically stated otherwise):
TargetDetails targetDetails = await _featureFlagTargetDetailsProvider.GetTargetDetails();
FeatureFlagInfo<BudgetFeatureFlagsHarness, bool> feature1FlagInfo = new(BudgetFeatureFlagsHarness.Feature1, false);
bool feature1Enabled = _featureFlags.GetFlagValue(awsTestPageFlagInfo, targetDetails); 
  
// Without target details (Only omit target details if specifically required):
FeatureFlagInfo<BudgetFeatureFlagsHarness, bool> feature1FlagInfo = new(BudgetFeatureFlagsHarness.Feature1, false);
  bool isFlag1Enabled = _featureFlags.GetFlagValue(awsTestPageFlagInfo, null);
if(feature1Enabled)
{
    // code for new feature
} 
else
{
  // code without new feature
}
```

## Setting the feature flag in the BFF for the unit tests
When creating unit test for controllers methods that utilize feature flags, there should be unit tests for both when the feature flag is on, and when it is off. You'll need to mock the targetDetailsProvider as well as the FeatureFlag and setup values to be returned.

Here is an example
```c#
//In ControllerTestsBase
protected Moq.Mock<IFeatureFlags<BudgetFeatureFlagsHarness>> _mockFeatureFlags;
protected Moq.Mock<ITargetDetailsProvider> _mockFeatureFlagTargetDetailsProvider;
protected void SetupMockClients()
{
		...
		_mockFeatureFlags = new Moq.Mock<IFeatureFlags<BudgetFeatureFlagsHarness>>();
		_mockFeatureFlagTargetDetailsProvider = new Moq.Mock<ITargetDetailsProvider>();
	 }
----------------------------------
//In the ControllerTests method:
public async Task Delete_NoContent_FlagOn()
{
	...
	TargetDetails targetDetails = new()
	{
	Identifier = "dev",
	Name = "Target Name",
	Attributes = new Dictionary<string, string>()
	};
...
_mockFeatureFlagTargetDetailsProvider.Setup(m => m.GetTargetDetails()).ReturnsAsync(targetDetails);
_mockFeatureFlags.Setup(m => m.GetFlagValue(It.IsAny<TipeCore.FeatureFlags.Harness.Interfaces.IFeatureFlagInfo<BudgetFeatureFlagsHarness, bool>>(), It.IsAny<ITargetDetails>())).Returns(true);
//... Do rest of set up and asserts on method.
}
public async Task Delete_NoContent_FlagOff
{
...
TargetDetails targetDetails = new()
{
Identifier = "dev",
Name = "Target Name",
Attributes = new Dictionary<string, string>()
};
_mockFeatureFlagTargetDetailsProvider.Setup(m => m.GetTargetDetails()).ReturnsAsync(targetDetails);
_mockFeatureFlags.Setup(m => m.GetFlagValue(It.IsAny<TipeCore.FeatureFlags.Harness.Interfaces.IFeatureFlagInfo<BudgetFeatureFlagsHarness, bool>>(), It.IsAny<ITargetDetails>())).Returns(false);
//... Do rest of setup and asserts on returned values as needed.
}
```

## Evaluate feature flag in the backend
Below are examples of how schema changes can be approached with feature flags. These are general guidelines and not exact steps to follow because each use case will be slightly different and may require a different approach. The goal of the examples below is to show how a schema change can be hidden behind a flag when flag is introduced and then removed when feature is released.

### Add new page with new backend entity
Development with feature flag
- Add front end page and hide it behind feature flag
- Add BFF controller and hide logic behind feature flag
- Add new entity and endpoints in the backend service
- Connect BFF to call the new backend endpoints

Clean up when flag is ready to be removed 
- Remove conditional feature flag code from front end and BFF

### Delete existing page and supporting backend entity
Development with feature flag
- Show/hide existing page based on value of the flag
- In the BFF endpoints that support the page, return 404 if flag is on

Clean up when flag is ready to be removed 

- Remove all front end code for the page
  - Remove all BFF and backend endpoints that support the page
- Add migration to delete the entity 

### Add a new required field to a page and existing backend entity
Development with feature flag
- Add new field on the page and hide it behind feature flag
  - Make the field required and default a value (default value will be removed later)

BFF/Backend changes:
- Option 1 - good for simple endpoints
  - Add new field to the client entity
  - Add new field to the backend entity; do not make it required yet
  - Add V2 of any backend endpoints that read data from the table and include the new field with the returned object 
  - In the BFF endpoints, add logic to call V2 of the backend endpoints based on flag setting with populating new field value

- Option 2 - good for more complex endpoints where it would be easier to create a new version of BFF endpoints than put if/else logic in multiple places to evaluate flag inside the BFF endpoints
  - Add V2 of client entity with the new field
  - Add new field to the backend entity; do not make it required yet
  - Add V2 of any backend endpoints that read data from the table and include the new field with the returned object 
  - Add V2 of BFF endpoints that use V2 of backend endpoints and V2 of client entity; hide logic behind feature flag
  - In angular service, call V1 or V2 of the BFF depending on flag setting

Clean up when flag is ready to be removed

- Option 1
  - Remove conditional flag code from front end and BFF
  - Make field required in BFF client entity
  - Remove V1 of backend endpoints
  - Add migration to make field required in the backend with default value filled in where empty
  - Remove code that is defaulting value in the front end

- Option 2
  - Remove conditional flag code from front end and BFF
  - Remove V1 of client entity, BFF and backend endpoints
  - Add migration to make field required in the backend with default value filled in where empty
  - Remove code that is defaulting value in the front end

### Update type of existing required field of backend entity
Development with feature flag
- Add new field with new type on the page and use feature flag value to determine which type of the field to show
  - Make the field required and default a value (default value will be removed later)
- Add V2 of client entity with the field of new type
- Add new field with new type to the backend entity; do not make it required yet
  - Consider what name to use
- Add new V2 of any endpoints that read data from the table and include the new field with the returned object
- Add V2 of BFF endpoints that call V2 of backend endpoints and hide logic behind feature flag
  - Default a value in the old field before sending to backend endpoints (default value will be removed later)
- In angular service, call V1 or V2 of the BFF depending on flag setting 

Clean up when flag is ready to be removed 
- Remove conditional flag code from front end and BFF
- Remove front end artifacts for the old field
- Remove V1 of client entity, BFF and backend endpoints
- Add migration 
  - Copy data from old field into new field converting data to new data type
  - Make the field with new type required in the backend; fill in default value where empty
  - Make the field with old type not required
- Remove code that is defaulting value in the front end
- Remove code that is defaulting value for old field in the BFF
- Add migration to remove old field from the database

### Delete required field from existing page and supporting backend entity
Development with feature flag
- Show/hide existing field on a page based on value of the flag
- Create V2 of the backend endpoints that do not return the value of field to be deleted
- Create V2 of BFF endpoints and client entity that does not have the field
  - Call V2 of backend endpoints and hide logic behind feature flag
  - For write actions, default a value for the field to be deleted to send to the backend (default value will be removed later)
- In angular service call V1 or V2 of BFF endpoints depending on feature flag setting

Clean up when flag is ready to be removed
- Remove conditional flag code from front end and BFF
- Add migration to make field to be deleted not required
- Remove V1 of the client entity, BFF and backend endpoints
- Remove code that defaults a value in the BFF
- Add migration to remove the field from the database