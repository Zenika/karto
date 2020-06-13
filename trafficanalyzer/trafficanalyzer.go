package trafficanalyzer

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/workqueue"
	"karto/types"
	"log"
	"sort"
	"time"
)

var portWildcard int32 = -1

type podIsolation struct {
	Pod             *corev1.Pod
	IngressPolicies []*networkingv1.NetworkPolicy
	EgressPolicies  []*networkingv1.NetworkPolicy
}

func (podIsolation *podIsolation) IsIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *podIsolation) IsEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *podIsolation) AddIngressPolicy(ingressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *podIsolation) AddEgressPolicy(egressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func newPodIsolation(pod *corev1.Pod) podIsolation {
	return podIsolation{
		Pod:             pod,
		IngressPolicies: make([]*networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]*networkingv1.NetworkPolicy, 0),
	}
}

func AnalyzeOnChange(k8sConfigPath string, resultsChannel chan<- types.AnalysisResult) {
	k8sClient := getK8sClient(k8sConfigPath)
	analyzeQueue := workqueue.NewRateLimitingQueue(workqueue.DefaultItemBasedRateLimiter())
	informerFactory := informers.NewSharedInformerFactory(k8sClient, 0)
	podInformer := informerFactory.Core().V1().Pods()
	policiesInformer := informerFactory.Networking().V1().NetworkPolicies()
	namespacesInformer := informerFactory.Core().V1().Namespaces()
	servicesInformer := informerFactory.Core().V1().Services()
	eventHandler := cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { analyzeQueue.Add(nil) },
		UpdateFunc: func(oldObj, newObj interface{}) { analyzeQueue.Add(nil) },
		DeleteFunc: func(obj interface{}) { analyzeQueue.Add(nil) },
	}
	podInformer.Informer().AddEventHandler(eventHandler)
	policiesInformer.Informer().AddEventHandler(eventHandler)
	namespacesInformer.Informer().AddEventHandler(eventHandler)
	servicesInformer.Informer().AddEventHandler(eventHandler)
	informerFactory.Start(wait.NeverStop)
	informerFactory.WaitForCacheSync(wait.NeverStop)
	for {
		obj, _ := analyzeQueue.Get()
		pods, err := podInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		policies, err := policiesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		namespaces, err := namespacesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		services, err := servicesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		resultsChannel <- analyze(pods, policies, namespaces, services)
		analyzeQueue.Forget(obj)
		analyzeQueue.Done(obj)
	}
}

func getK8sClient(k8sClientConfig string) *kubernetes.Clientset {
	var config *rest.Config
	var err1InsideCluster, errOutsideCluster error
	config, err1InsideCluster = rest.InClusterConfig()
	if err1InsideCluster != nil {
		log.Println("Unable to connect to Kubernetes service, fallback to kubeconfig file")
		config, errOutsideCluster = clientcmd.BuildConfigFromFlags("", k8sClientConfig)
		if errOutsideCluster != nil {
			panic(errOutsideCluster.Error())
		}
	}
	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return k8sClient
}

func analyze(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy, namespaces []*corev1.Namespace, services []*corev1.Service) types.AnalysisResult {
	start := time.Now()
	podIsolations := computePodIsolations(pods, policies)
	allowedRoutes := computeAllowedRoutes(podIsolations, namespaces)
	servicesWithTargetPods := computeServicesWithTargetPods(services, pods)
	elapsed := time.Since(start)
	log.Printf("Finished analysis in %s, found %d pods and %d allowed pod-to-pod routes\n", elapsed, len(podIsolations), len(allowedRoutes))
	return types.AnalysisResult{
		Pods:          fromK8sPodIsolations(podIsolations),
		AllowedRoutes: allowedRoutes,
		Services:      servicesWithTargetPods,
	}
}

func computePodIsolations(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy) []podIsolation {
	podIsolations := make([]podIsolation, 0)
	for _, pod := range pods {
		podIsolation := computePodIsolation(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod *corev1.Pod, policies []*networkingv1.NetworkPolicy) podIsolation {
	podIsolation := newPodIsolation(pod)
	for _, policy := range policies {
		namespaceMatches := namespaceMatches(pod, policy)
		selectorMatches := selectorMatches(pod.Labels, policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := policyTypes(policy)
			if isIngress {
				podIsolation.AddIngressPolicy(policy)
			}
			if isEgress {
				podIsolation.AddEgressPolicy(policy)
			}
		}
	}
	return podIsolation
}

func policyTypes(policy *networkingv1.NetworkPolicy) (bool, bool) {
	var isIngress, isEgress bool
	for _, policyType := range policy.Spec.PolicyTypes {
		if policyType == "Ingress" {
			isIngress = true
		} else if policyType == "Egress" {
			isEgress = true
		}
	}
	return isIngress, isEgress
}

func computeAllowedRoutes(podIsolations []podIsolation, namespaces []*corev1.Namespace) []types.AllowedRoute {
	allowedRoutes := make([]types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := computeAllowedRoute(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, *allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func computeAllowedRoute(sourcePodIsolation podIsolation, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) *types.AllowedRoute {
	ingressPoliciesByPort := ingressPoliciesByPort(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	egressPoliciesByPort := egressPoliciesByPort(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	ports, ingressPolicies, egressPolicies := matchPoliciesByPort(ingressPoliciesByPort, egressPoliciesByPort)
	if ports == nil || len(ports) > 0 {
		return &types.AllowedRoute{
			SourcePod:       fromK8sPodIsolation(sourcePodIsolation),
			EgressPolicies:  fromK8sNetworkPolicies(egressPolicies),
			TargetPod:       fromK8sPodIsolation(targetPodIsolation),
			IngressPolicies: fromK8sNetworkPolicies(ingressPolicies),
			Ports:           ports,
		}
	} else {
		return nil
	}
}

func computeServicesWithTargetPods(services []*corev1.Service, pods []*corev1.Pod) []types.Service {
	servicesWithTargetPods := make([]types.Service, 0)
	for _, service := range services {
		serviceWithTargetPods := computeServiceWithTargetPods(service, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func computeServiceWithTargetPods(service *corev1.Service, pods []*corev1.Pod) types.Service {
	targetPods := make([]types.Pod, 0)
	for _, pod := range pods {
		selectorMatches := labelsMatches(pod.Labels, service.Spec.Selector)
		if selectorMatches {
			targetPods = append(targetPods, fromK8sPod(pod))
		}
	}
	return types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: targetPods,
	}
}

func ingressPoliciesByPort(sourcePod *corev1.Pod, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !targetPodIsolation.IsIngressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, ingressPolicy := range targetPodIsolation.IngressPolicies {
			for _, ingressRule := range ingressPolicy.Spec.Ingress {
				if ingressRuleAllows(sourcePod, ingressRule, namespaces) {
					if len(ingressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, targetPodIsolation.IngressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range ingressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, targetPodIsolation.IngressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func ingressRuleAllows(sourcePod *corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func egressPoliciesByPort(targetPod *corev1.Pod, sourcePodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !sourcePodIsolation.IsEgressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, egressPolicy := range sourcePodIsolation.EgressPolicies {
			for _, egressRule := range egressPolicy.Spec.Egress {
				if egressRuleAllows(targetPod, egressRule, namespaces) {
					if len(egressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, sourcePodIsolation.EgressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range egressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, sourcePodIsolation.EgressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func egressRuleAllows(targetPod *corev1.Pod, egressRule networkingv1.NetworkPolicyEgressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func matchPoliciesByPort(ingressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy, egressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy) ([]int32, []*networkingv1.NetworkPolicy, []*networkingv1.NetworkPolicy) {
	portsSet := make(map[int32]bool)
	ingressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	egressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	for ingressPort, ingressPolicies := range ingressPoliciesByPort {
		for egressPort, egressPolicies := range egressPoliciesByPort {
			if ingressPort == portWildcard || egressPort == portWildcard || ingressPort == egressPort {
				if ingressPort == portWildcard {
					portsSet[egressPort] = true
				} else {
					portsSet[ingressPort] = true
				}
				for _, egressPolicy := range egressPolicies {
					egressPoliciesSet[egressPolicy] = true
				}
				for _, ingressPolicy := range ingressPolicies {
					ingressPoliciesSet[ingressPolicy] = true
				}
			}
		}
	}
	if portsSet[portWildcard] {
		portsSet = nil
	}
	var ports []int32
	if portsSet != nil {
		ports = make([]int32, 0, len(portsSet))
		for port := range portsSet {
			ports = append(ports, port)
		}
		sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	}
	ingressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for ingressPolicy := range ingressPoliciesSet {
		ingressPolicies = append(ingressPolicies, ingressPolicy)
	}
	egressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for egressPolicy := range egressPoliciesSet {
		egressPolicies = append(egressPolicies, egressPolicy)
	}
	return ports, ingressPolicies, egressPolicies
}

func networkRuleMatches(pod *corev1.Pod, policyPeer networkingv1.NetworkPolicyPeer, namespaces []*corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil || namespaceLabelsMatches(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || selectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func namespaceLabelsMatches(namespaceName string, namespaces []*corev1.Namespace, selector metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = *candidateNamespace
			break
		}
	}
	return selectorMatches(namespace.Labels, selector)
}

func namespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func selectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, err := metav1.LabelSelectorAsSelector(&labelSelector)
	if err != nil {
		log.Fatalf("Could not parse LabelSelector %v\n", labelSelector)
		return false
	}
	return selector.Matches(labels.Set(objectLabels))
}

func labelsMatches(objectLabels map[string]string, matchLabels map[string]string) bool {
	if matchLabels == nil {
		return false
	}
	return selectorMatches(objectLabels, *metav1.SetAsLabelSelector(matchLabels))
}

func fromK8sPodIsolation(podIsolation podIsolation) types.PodWithIsolation {
	return types.PodWithIsolation{
		Name:              podIsolation.Pod.Name,
		Namespace:         podIsolation.Pod.Namespace,
		Labels:            podIsolation.Pod.Labels,
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func fromK8sPodIsolations(podIsolations []podIsolation) []types.PodWithIsolation {
	result := make([]types.PodWithIsolation, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, fromK8sPodIsolation(podIsolation))
	}
	return result
}

func fromK8sPod(pod *corev1.Pod) types.Pod {
	return types.Pod{
		Name:      pod.Name,
		Namespace: pod.Namespace,
		Labels:    pod.Labels,
	}
}

func fromK8sNetworkPolicy(networkPolicy networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}

func fromK8sNetworkPolicies(networkPolicies []*networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, fromK8sNetworkPolicy(*networkPolicy))
	}
	return result
}
